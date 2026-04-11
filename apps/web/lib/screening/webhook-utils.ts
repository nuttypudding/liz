/**
 * Webhook signature verification utilities for screening providers.
 */

/**
 * Verify SmartMove webhook signature using HMAC-SHA256.
 */
export async function verifySmartMoveSignature(
  payload: string,
  signature: string,
  apiKey: string
): Promise<boolean> {
  const crypto = await import('crypto');

  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
    .update(payload)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Extract application ID from webhook payload.
 */
export function extractApplicationId(payload: Record<string, unknown>): string | null {
  return (payload.reference_id as string) || null;
}

/**
 * Check if webhook indicates a terminal status (completed or failed).
 */
export function isCompletionWebhook(payload: Record<string, unknown>): boolean {
  return payload.status === 'completed' || payload.status === 'failed';
}
