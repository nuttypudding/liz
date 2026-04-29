---
id: 191
title: Screening webhook handler — POST /api/webhooks/screening
tier: Sonnet
depends_on: [190]
feature: P3-002-ai-tenant-screening
---

# 191 — Screening webhook handler — POST /api/webhooks/screening

## Objective
Create a webhook endpoint to receive background check completion notifications from TransUnion SmartMove. Validates signatures, retrieves final results, triggers AI analysis, and updates the application and screening_report status.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

SmartMove sends webhook events when background checks complete. This endpoint:
1. Validates webhook signature
2. Retrieves final results
3. Triggers AI analysis (task 189)
4. Updates screening_report and application status
5. Logs audit trail

## Implementation

### 1. Create webhook endpoint

Create `apps/web/app/api/webhooks/screening/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getScreeningProvider } from '@/lib/screening/providers/factory';
import { createScreeningReport } from '@/lib/screening/screening-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/webhooks/screening
 * Handle background check completion webhooks from screening provider
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw request body for signature verification
    const rawBody = await req.text();

    // Get signature from headers
    const signature = req.headers.get('x-smartmove-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Parse body
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Verify signature
    const provider = getScreeningProvider(payload.provider || 'smartmove');
    const isValid = await provider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('Invalid webhook signature from provider');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Extract order ID and reference ID (application ID)
    const { order_id, reference_id, status } = payload;

    if (!order_id || !reference_id) {
      return NextResponse.json(
        { error: 'Missing order_id or reference_id' },
        { status: 400 }
      );
    }

    // Find application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, landlord_id')
      .eq('id', reference_id)
      .single();

    if (appError || !application) {
      console.error('Application not found:', reference_id);
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Update application status to 'screening'
    const { error: updateStatusError } = await supabase
      .from('applications')
      .update({
        status: 'screening',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reference_id);

    if (updateStatusError) {
      console.error('Failed to update application status:', updateStatusError);
    }

    // If status is completed, retrieve results and trigger analysis
    if (status === 'completed') {
      try {
        // Get results from provider
        const results = await provider.getResults(order_id);

        if (results.success) {
          // Create screening report with AI analysis
          const reportResult = await createScreeningReport(
            reference_id,
            results.background_check,
            results.credit_score_range
          );

          if (!reportResult.success) {
            console.error('Failed to create screening report:', reportResult.error);
            // Log error but don't fail webhook
          }
        } else {
          console.error('Failed to get results from provider:', results.error);
        }
      } catch (error) {
        console.error('Error processing webhook:', error);
        // Non-fatal; webhook should succeed even if follow-up fails
      }
    }

    // Log webhook receipt to audit trail
    const { error: auditError } = await supabase
      .from('screening_audit_log')
      .insert([
        {
          application_id: reference_id,
          action: 'webhook',
          actor_id: null, // System action
          details: {
            provider: payload.provider,
            order_id,
            webhook_status: status,
          },
        },
      ]);

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    // Return success (webhook should confirm quickly)
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Create webhook signature verification helper

Create `apps/web/lib/screening/webhook-utils.ts`:

```typescript
/**
 * Webhook signature verification utilities
 */

/**
 * Verify SmartMove webhook signature
 * SmartMove signs webhooks with HMAC-SHA256
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
 * Extract application ID from webhook payload
 */
export function extractApplicationId(payload: any): string | null {
  // SmartMove uses reference_id to track application
  return payload.reference_id || null;
}

/**
 * Check if webhook indicates completion
 */
export function isCompletionWebhook(payload: any): boolean {
  return payload.status === 'completed' || payload.status === 'failed';
}
```

### 3. Create webhook test helper

Create `apps/web/lib/screening/__tests__/webhook.test.ts`:

```typescript
import {
  verifySmartMoveSignature,
  extractApplicationId,
  isCompletionWebhook,
} from '../webhook-utils';

describe('Webhook Utilities', () => {
  test('verifySmartMoveSignature validates correct signature', async () => {
    const payload = JSON.stringify({ order_id: 'test-123' });
    const apiKey = 'secret-key';

    // In real test, use actual HMAC calculation
    // For this example, we skip the actual signature generation
    const crypto = require('crypto');
    const correctSignature = crypto
      .createHmac('sha256', apiKey)
      .update(payload)
      .digest('hex');

    const isValid = await verifySmartMoveSignature(payload, correctSignature, apiKey);
    expect(isValid).toBe(true);
  });

  test('extractApplicationId retrieves reference_id', () => {
    const payload = { reference_id: 'app-123', order_id: 'order-456' };
    expect(extractApplicationId(payload)).toBe('app-123');
  });

  test('isCompletionWebhook detects completed status', () => {
    expect(isCompletionWebhook({ status: 'completed' })).toBe(true);
    expect(isCompletionWebhook({ status: 'failed' })).toBe(true);
    expect(isCompletionWebhook({ status: 'in-progress' })).toBe(false);
  });
});
```

## Acceptance Criteria
1. [ ] POST endpoint at `/api/webhooks/screening` accepts webhook events
2. [ ] Extracts and verifies webhook signature (provider-specific)
3. [ ] Returns 401 for invalid/missing signature
4. [ ] Parses webhook payload (JSON)
5. [ ] Extracts order_id and reference_id (application_id)
6. [ ] Returns 404 if application not found
7. [ ] Updates application status to 'screening' on webhook receipt
8. [ ] If webhook status = 'completed':
   - Retrieves final results from provider
   - Calls createScreeningReport() to run AI analysis
   - Updates screening_report and application status to 'screened'
9. [ ] Logs webhook to screening_audit_log
10. [ ] Non-fatal errors don't cause webhook to fail (returns 200)
11. [ ] Webhook utilities tested (signature verification, parsing)
12. [ ] Integrated with screening orchestrator (task 192)
