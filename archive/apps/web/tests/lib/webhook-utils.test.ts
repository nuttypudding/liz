import { describe, test, expect } from 'vitest';
import {
  verifySmartMoveSignature,
  extractApplicationId,
  isCompletionWebhook,
} from '../../lib/screening/webhook-utils';
import { createHmac } from 'crypto';

describe('Webhook Utilities', () => {
  describe('verifySmartMoveSignature', () => {
    test('accepts a correct HMAC-SHA256 signature', async () => {
      const payload = JSON.stringify({ order_id: 'test-123' });
      const apiKey = 'secret-key';
      const correctSignature = createHmac('sha256', apiKey).update(payload).digest('hex');

      const isValid = await verifySmartMoveSignature(payload, correctSignature, apiKey);
      expect(isValid).toBe(true);
    });

    test('rejects an incorrect signature', async () => {
      const payload = JSON.stringify({ order_id: 'test-123' });
      const isValid = await verifySmartMoveSignature(payload, 'bad-signature', 'secret-key');
      expect(isValid).toBe(false);
    });

    test('rejects signature generated with a different key', async () => {
      const payload = JSON.stringify({ order_id: 'test-123' });
      const wrongSig = createHmac('sha256', 'wrong-key').update(payload).digest('hex');
      const isValid = await verifySmartMoveSignature(payload, wrongSig, 'secret-key');
      expect(isValid).toBe(false);
    });
  });

  describe('extractApplicationId', () => {
    test('returns reference_id from payload', () => {
      expect(extractApplicationId({ reference_id: 'app-123', order_id: 'order-456' })).toBe('app-123');
    });

    test('returns null when reference_id is missing', () => {
      expect(extractApplicationId({ order_id: 'order-456' })).toBeNull();
    });
  });

  describe('isCompletionWebhook', () => {
    test('returns true for completed status', () => {
      expect(isCompletionWebhook({ status: 'completed' })).toBe(true);
    });

    test('returns true for failed status', () => {
      expect(isCompletionWebhook({ status: 'failed' })).toBe(true);
    });

    test('returns false for in-progress status', () => {
      expect(isCompletionWebhook({ status: 'in-progress' })).toBe(false);
    });

    test('returns false for pending status', () => {
      expect(isCompletionWebhook({ status: 'pending' })).toBe(false);
    });
  });
});
