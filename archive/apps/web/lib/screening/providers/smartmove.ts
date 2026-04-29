import {
  ScreeningProvider,
  CreateOrderOptions,
  CreateOrderResult,
  OrderStatus,
  ProviderResults,
  OrderStatusType,
  BackgroundCheckResult,
  EvictionRecord,
  CriminalRecord,
  BankruptcyRecord,
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
        reference_id: options.application_id,
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
        order_url: data.order_url,
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

function parseBackgroundCheck(report: Record<string, unknown> | undefined): BackgroundCheckResult | undefined {
  if (!report) return undefined;

  return {
    clear: !report.has_records,
    eviction_records: (report.eviction_records as EvictionRecord[]) || [],
    criminal_records: (report.criminal_records as CriminalRecord[]) || [],
    bankruptcy_records: (report.bankruptcy_records as BankruptcyRecord[]) || [],
    summary: (report.summary as string) || 'Background check completed',
  };
}
