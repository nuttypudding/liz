---
id: 190
title: Screening provider interface + TransUnion SmartMove adapter
tier: Sonnet
depends_on: [180]
feature: P3-002-ai-tenant-screening
---

# 190 — Screening provider interface + TransUnion SmartMove adapter

## Objective
Create an abstract screening provider interface and implement a TransUnion SmartMove adapter to handle background check ordering, status polling, and result parsing. Enables pluggable screening providers for future extensibility (Checkr, etc.).

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Background check integration via TransUnion SmartMove API. Creates orders, polls for completion, and parses results for use by AI analysis (task 189).

## Implementation

### 1. Create provider interface

Create `apps/web/lib/screening/providers/interface.ts`:

```typescript
import { ScreeningReport } from '../types';

/**
 * Abstract screening provider interface
 * Implementations handle order creation, status polling, result retrieval
 */
export interface ScreeningProvider {
  /**
   * Create a background check order
   */
  createOrder(options: CreateOrderOptions): Promise<CreateOrderResult>;

  /**
   * Check order status
   */
  getOrderStatus(orderId: string): Promise<OrderStatus>;

  /**
   * Retrieve completed results
   */
  getResults(orderId: string): Promise<ProviderResults>;

  /**
   * Webhook signature verification (if provider uses webhooks)
   */
  verifyWebhookSignature?(
    payload: string,
    signature: string
  ): Promise<boolean>;
}

/**
 * Order creation request
 */
export interface CreateOrderOptions {
  application_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  ssn?: string; // If available/permitted
  address?: string;
}

/**
 * Order creation response
 */
export interface CreateOrderResult {
  success: boolean;
  external_order_id: string; // ID from provider (for tracking)
  order_url?: string; // URL to redirect user if needed
  error?: string;
}

/**
 * Order status
 */
export type OrderStatusType = 'pending' | 'completed' | 'failed' | 'expired';

export interface OrderStatus {
  status: OrderStatusType;
  external_order_id: string;
  completed_at?: string;
  error?: string;
}

/**
 * Screening results from provider
 */
export interface ProviderResults {
  success: boolean;
  external_order_id: string;
  credit_score_range?: string; // e.g., '600-650', 'no-hit'
  background_check?: BackgroundCheckResult;
  error?: string;
}

/**
 * Background check result structure
 */
export interface BackgroundCheckResult {
  clear: boolean; // true if no disqualifying records
  eviction_records?: EvictionRecord[];
  criminal_records?: CriminalRecord[];
  bankruptcy_records?: BankruptcyRecord[];
  summary: string; // Plain text summary
}

export interface EvictionRecord {
  county: string;
  filing_date: string;
  status: string;
}

export interface CriminalRecord {
  charge: string;
  date: string;
  status: string;
}

export interface BankruptcyRecord {
  filing_date: string;
  status: string;
}
```

### 2. Create TransUnion SmartMove adapter

Create `apps/web/lib/screening/providers/smartmove.ts`:

```typescript
import {
  ScreeningProvider,
  CreateOrderOptions,
  CreateOrderResult,
  OrderStatus,
  ProviderResults,
  OrderStatusType,
} from './interface';

/**
 * TransUnion SmartMove adapter
 * https://www.smartmove.com/
 */
export class SmartMoveProvider implements ScreeningProvider {
  private apiKey: string;
  private accountId: string;
  private baseUrl = 'https://api.smartmove.com/v1';

  constructor() {
    this.apiKey = process.env.SMARTMOVE_API_KEY || '';
    this.accountId = process.env.SMARTMOVE_ACCOUNT_ID || '';

    if (!this.apiKey || !this.accountId) {
      throw new Error('SmartMove credentials not configured');
    }
  }

  async createOrder(options: CreateOrderOptions): Promise<CreateOrderResult> {
    try {
      const payload = {
        account_id: this.accountId,
        applicant: {
          first_name: options.first_name,
          last_name: options.last_name,
          email: options.email,
          phone: options.phone,
          date_of_birth: options.date_of_birth,
          ssn: options.ssn,
          address: options.address,
        },
        // Custom fields for tracking
        reference_id: options.application_id, // Track to application
        package: 'comprehensive', // Background + credit check
      };

      const res = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        return {
          success: false,
          external_order_id: '',
          error: error.message || 'SmartMove API error',
        };
      }

      const data = await res.json();

      return {
        success: true,
        external_order_id: data.order_id,
        order_url: data.order_url, // URL to complete application if needed
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        external_order_id: '',
        error: message,
      };
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        return {
          status: 'failed',
          external_order_id: orderId,
          error: error.message || 'Failed to retrieve order status',
        };
      }

      const data = await res.json();

      // Map SmartMove status to standard status
      const statusMap: Record<string, OrderStatusType> = {
        'in-progress': 'pending',
        'completed': 'completed',
        'failed': 'failed',
        'expired': 'expired',
      };

      return {
        status: statusMap[data.status] || 'pending',
        external_order_id: orderId,
        completed_at: data.completed_at,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'failed',
        external_order_id: orderId,
        error: message,
      };
    }
  }

  async getResults(orderId: string): Promise<ProviderResults> {
    try {
      const res = await fetch(`${this.baseUrl}/orders/${orderId}/results`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        return {
          success: false,
          external_order_id: orderId,
          error: error.message || 'Failed to retrieve results',
        };
      }

      const data = await res.json();

      // Parse SmartMove response
      const creditScoreRange = data.credit_report?.score_range || undefined;
      const backgroundCheck = parseBackgroundCheck(data.background_report);

      return {
        success: true,
        external_order_id: orderId,
        credit_score_range: creditScoreRange,
        background_check: backgroundCheck,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        external_order_id: orderId,
        error: message,
      };
    }
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    // SmartMove webhook signature verification
    // Implementation depends on SmartMove's signature scheme (HMAC, etc.)
    try {
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.apiKey)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }
}

/**
 * Parse SmartMove background check response
 */
function parseBackgroundCheck(report: any) {
  if (!report) return undefined;

  return {
    clear: !report.has_records,
    eviction_records: report.eviction_records || [],
    criminal_records: report.criminal_records || [],
    bankruptcy_records: report.bankruptcy_records || [],
    summary: report.summary || 'Background check completed',
  };
}
```

### 3. Create provider factory

Create `apps/web/lib/screening/providers/factory.ts`:

```typescript
import { ScreeningProvider } from './interface';
import { SmartMoveProvider } from './smartmove';

export function getScreeningProvider(providerName: string): ScreeningProvider {
  switch (providerName.toLowerCase()) {
    case 'smartmove':
      return new SmartMoveProvider();
    // Future: add Checkr, other providers
    default:
      throw new Error(`Unknown screening provider: ${providerName}`);
  }
}
```

## Acceptance Criteria
1. [ ] Provider interface defined with standard methods (createOrder, getOrderStatus, getResults, verifyWebhookSignature)
2. [ ] SmartMove adapter implements all interface methods
3. [ ] createOrder() accepts applicant data, calls SmartMove API, returns order_id
4. [ ] getOrderStatus() polls order status, maps to standard status enum
5. [ ] getResults() retrieves completed results with credit score range and background check details
6. [ ] SmartMove API credentials loaded from environment variables
7. [ ] Error handling: returns structured error responses
8. [ ] Factory function available for provider selection
9. [ ] Ready for webhook integration (task 191)
10. [ ] Ready for screening orchestrator (task 192)
