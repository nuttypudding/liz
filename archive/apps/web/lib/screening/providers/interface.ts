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

// Ensure ScreeningReport is referenced (used by orchestrator consuming results)
export type { ScreeningReport };
