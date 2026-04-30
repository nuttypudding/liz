import type {
  ScreeningProvider,
  CreateOrderOptions,
  CreateOrderResult,
  OrderStatus,
  ProviderResults,
} from '@/lib/screening/providers/interface';

export class MockScreeningProvider implements ScreeningProvider {
  async createOrder(options: CreateOrderOptions): Promise<CreateOrderResult> {
    return {
      success: true,
      external_order_id: `mock-order-${Date.now()}`,
    };
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    return {
      status: 'completed',
      external_order_id: orderId,
      completed_at: new Date().toISOString(),
    };
  }

  async getResults(orderId: string): Promise<ProviderResults> {
    return {
      success: true,
      external_order_id: orderId,
      credit_score_range: '700-750',
      background_check: {
        clear: true,
        summary: 'No records found',
      },
    };
  }

  async verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean> {
    return true;
  }
}
