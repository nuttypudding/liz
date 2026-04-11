---
id: 205
title: Integration tests — full screening pipeline (submit → screen → decide)
tier: Sonnet
depends_on: [192, 186]
feature: P3-002-ai-tenant-screening
---

# 205 — Integration tests — full screening pipeline (submit → screen → decide)

## Objective
Create end-to-end integration tests for the full screening workflow: applicant submits → landlord initiates screening → webhook completes background check → AI analysis runs → landlord makes decision. Tests verify all APIs work together.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Integration tests using Jest + test database (or fixtures). Tests full workflow, not individual units.

## Implementation

### 1. Create integration test

Create `apps/web/__tests__/integration/screening-pipeline.test.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { mockApplicationPayload } from '../api/screening.test-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Screening Pipeline Integration', () => {
  let applicationId: string;
  let trackingId: string;

  afterAll(async () => {
    // Cleanup
    if (applicationId) {
      await supabase
        .from('screening_audit_log')
        .delete()
        .eq('application_id', applicationId);

      await supabase
        .from('screening_reports')
        .delete()
        .eq('application_id', applicationId);

      await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId);
    }
  });

  test('Complete workflow: submit → screen → decide', async () => {
    // Step 1: Applicant submits application
    const submitRes = await fetch(
      'http://localhost:3000/api/applications',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockApplicationPayload),
      }
    );

    expect(submitRes.status).toBe(201);
    const submitData = await submitRes.json();
    expect(submitData.success).toBe(true);
    expect(submitData.tracking_id).toBeDefined();

    trackingId = submitData.tracking_id;

    // Verify application created
    const { data: app1 } = await supabase
      .from('applications')
      .select('*')
      .eq('tracking_id', trackingId)
      .single();

    expect(app1).toBeDefined();
    expect(app1.status).toBe('submitted');
    applicationId = app1.id;

    // Step 2: Verify applicant can check status
    const statusRes = await fetch(
      `http://localhost:3000/api/applications/status/${trackingId}`,
      { method: 'GET' }
    );

    expect(statusRes.status).toBe(200);
    const statusData = await statusRes.json();
    expect(statusData.status).toBe('submitted');
    expect(statusData.message).toBeDefined();
    expect(statusData.status_timeline).toBeDefined();

    // Step 3: Landlord initiates screening (requires auth, skip in this test)
    // In real test, mock Clerk auth and call POST /api/applications/[id]/screen

    // Step 4: Simulate webhook callback from background check provider
    // This would normally come from TransUnion, but we can simulate completion
    const { data: report } = await supabase
      .from('screening_reports')
      .update({
        status: 'completed',
        risk_score: 45,
        recommendation: 'approve',
        ai_analysis: {
          risk_factors: [
            {
              category: 'income',
              name: 'Income-to-Rent Ratio',
              signal: 'positive',
              details: '5.0x monthly rent',
              weight: 'high',
            },
          ],
          summary: 'Strong financial profile',
          recommendation: 'approve',
          confidence_score: 0.9,
        },
      })
      .eq('application_id', applicationId)
      .select()
      .single();

    expect(report).toBeDefined();

    // Verify application now shows risk score
    const { data: app2 } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    expect(app2.status).toBe('screened');

    // Step 5: Verify status page now shows screening complete
    const status2Res = await fetch(
      `http://localhost:3000/api/applications/status/${trackingId}`,
      { method: 'GET' }
    );

    const status2Data = await status2Res.json();
    expect(status2Data.status).toBe('screened');

    // Step 6: Landlord makes decision (would require auth)
    // In real test:
    // const decideRes = await fetch(
    //   `http://localhost:3000/api/applications/${applicationId}/decide`,
    //   {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json', 'Authorization': '...' },
    //     body: JSON.stringify({ decision: 'approve' }),
    //   }
    // );
    // expect(decideRes.status).toBe(200);

    // Verify audit log recorded all actions
    const { data: auditLog } = await supabase
      .from('screening_audit_log')
      .select('*')
      .eq('application_id', applicationId)
      .order('timestamp', { ascending: true });

    expect(auditLog && auditLog.length > 0).toBe(true);
  });

  test('Duplicate submission prevented within 30 days', async () => {
    // First submission
    const res1 = await fetch(
      'http://localhost:3000/api/applications',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockApplicationPayload),
      }
    );

    expect(res1.status).toBe(201);

    // Second submission (same email + property)
    const res2 = await fetch(
      'http://localhost:3000/api/applications',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockApplicationPayload),
      }
    );

    expect(res2.status).toBe(409);
    const data2 = await res2.json();
    expect(data2.error).toContain('already submitted');
  });
});
```

### 2. Create mock provider for testing

Create `apps/web/__tests__/mocks/screening-provider.mock.ts`:

```typescript
import { ScreeningProvider, CreateOrderOptions, CreateOrderResult, OrderStatus, ProviderResults } from '@/lib/screening/providers/interface';

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
    return true; // Always valid in tests
  }
}
```

## Acceptance Criteria
1. [ ] Integration test file created: `__tests__/integration/screening-pipeline.test.ts`
2. [ ] Test: applicant submits application
3. [ ] Test: application created with 'submitted' status
4. [ ] Test: applicant can check status via public endpoint
5. [ ] Test: landlord can initiate screening (with mocked auth)
6. [ ] Test: background check completion updates application
7. [ ] Test: AI analysis generates risk score
8. [ ] Test: application status updates to 'screened'
9. [ ] Test: landlord can make approval/denial decision
10. [ ] Test: audit log records all actions
11. [ ] Test: duplicate submission blocked (409)
12. [ ] All integration tests pass (npm run test:integration)
13. [ ] Mock screening provider used for testing
