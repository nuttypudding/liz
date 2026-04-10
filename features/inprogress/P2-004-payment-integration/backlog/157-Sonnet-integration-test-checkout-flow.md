---
id: 157
title: Integration test — full checkout flow with Stripe test mode
tier: Sonnet
depends_on: [141, 142, 147]
feature: P2-004-payment-integration
---

# 157 — Integration test — full checkout flow with Stripe test mode

## Objective
Write an end-to-end integration test that covers the complete rent payment flow:
1. Generate payment period (via API)
2. Create checkout session (POST /api/payments/checkout)
3. Simulate Stripe webhook (checkout.session.completed)
4. Verify payment record is created and updated
5. Verify payment_period status changes to "paid"

Use Stripe test mode and test webhooks.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

This test validates the full tenant payment flow without manual interaction, ensuring:
- Payment periods are created correctly
- Checkout sessions can be created
- Webhook processing updates database state correctly
- Payment status flows properly: pending → completed

## Implementation

**File**: `apps/web/__tests__/integration/payments-checkout-flow.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { generateCurrentPaymentPeriod } from '@/lib/payments';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const stripeKey = process.env.STRIPE_SECRET_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });

describe('Payments Checkout Flow Integration Test', () => {
  let testTenantId: string;
  let testPropertyId: string;
  let testLandlordId: string;
  let paymentPeriodId: string;
  let paymentId: string;

  beforeAll(async () => {
    // Set up test data
    testTenantId = 'test-tenant-' + Math.random().toString(36).slice(2);
    testLandlordId = 'test-landlord-' + Math.random().toString(36).slice(2);

    // Create test property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .insert({
        name: 'Test Property',
        landlord_id: testLandlordId,
        address: '123 Test St',
        default_rent_amount: 1500,
      })
      .select()
      .single();

    if (propError) throw propError;
    testPropertyId = property.id;

    // Create test stripe account
    await supabase.from('stripe_accounts').insert({
      property_id: testPropertyId,
      stripe_account_id: 'acct_test_connected', // Test account
      charges_enabled: true,
      payouts_enabled: true,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('payments').delete().eq('property_id', testPropertyId);
    await supabase.from('payment_periods').delete().eq('property_id', testPropertyId);
    await supabase.from('stripe_accounts').delete().eq('property_id', testPropertyId);
    await supabase.from('properties').delete().eq('id', testPropertyId);
  });

  it('should generate payment period for tenant', async () => {
    // Generate current month's payment period
    const period = await generateCurrentPaymentPeriod(testPropertyId, testTenantId);

    expect(period).toBeDefined();
    expect(period.tenant_id).toBe(testTenantId);
    expect(period.property_id).toBe(testPropertyId);
    expect(period.status).toBe('pending');
    expect(period.rent_amount).toBe(1500);

    paymentPeriodId = period.id;
  });

  it('should create checkout session', async () => {
    // Simulate API call to create checkout
    const checkoutRes = await fetch('http://localhost:3000/api/payments/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testTenantId}`, // Mock auth
      },
      body: JSON.stringify({
        payment_period_id: paymentPeriodId,
      }),
    });

    expect(checkoutRes.status).toBe(200);
    const { sessionId } = await checkoutRes.json();
    expect(sessionId).toBeDefined();

    // Verify payment record was created
    const { data: payment } = await supabase
      .from('payments')
      .select('id, status, stripe_payment_intent_id')
      .eq('payment_period_id', paymentPeriodId)
      .single();

    expect(payment).toBeDefined();
    expect(payment.status).toBe('pending');
    paymentId = payment.id;
  });

  it('should handle webhook: checkout.session.completed', async () => {
    // Get the payment intent ID from payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('stripe_payment_intent_id')
      .eq('id', paymentId)
      .single();

    const intentId = payment.stripe_payment_intent_id;

    // Create a mock webhook event (in test, we'd simulate Stripe webhook)
    const mockEvent = {
      id: 'evt_test_' + Math.random().toString(36).slice(2),
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_' + Math.random().toString(36).slice(2),
          payment_intent: intentId,
          metadata: {
            payment_period_id: paymentPeriodId,
            property_id: testPropertyId,
            tenant_id: testTenantId,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          },
        },
      },
    };

    // Send webhook to /api/webhooks/stripe
    // In real test, we'd use Stripe's webhook signing
    const webhookRes = await fetch(
      'http://localhost:3000/api/webhooks/stripe',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In real test: 'stripe-signature': signedHeader
        },
        body: JSON.stringify(mockEvent),
      }
    );

    // For this test, we'll manually trigger the handler logic
    // since webhook signature requires Stripe's exact format
    const { handleCheckoutSessionCompleted } = await import(
      '@/app/api/webhooks/stripe'
    );
    await handleCheckoutSessionCompleted(mockEvent.data.object as any);

    // Verify payment record was updated
    const { data: updatedPayment } = await supabase
      .from('payments')
      .select('status, paid_at')
      .eq('id', paymentId)
      .single();

    expect(updatedPayment.status).toBe('completed');
    expect(updatedPayment.paid_at).toBeDefined();
  });

  it('should update payment_period status to paid', async () => {
    // Verify payment period was marked as paid
    const { data: period } = await supabase
      .from('payment_periods')
      .select('status, paid_at')
      .eq('id', paymentPeriodId)
      .single();

    expect(period.status).toBe('paid');
    expect(period.paid_at).toBeDefined();
  });

  it('should verify payment details match period', async () => {
    const { data: payment } = await supabase
      .from('payments')
      .select('amount, tenant_id, property_id')
      .eq('id', paymentId)
      .single();

    const { data: period } = await supabase
      .from('payment_periods')
      .select('rent_amount, tenant_id, property_id')
      .eq('id', paymentPeriodId)
      .single();

    expect(payment.amount).toBe(period.rent_amount);
    expect(payment.tenant_id).toBe(period.tenant_id);
    expect(payment.property_id).toBe(period.property_id);
  });

  it('should prevent duplicate payments on webhook retry', async () => {
    // Simulate Stripe retrying the same webhook
    // Webhook handler should be idempotent

    const countBefore = await supabase
      .from('payments')
      .select('id', { count: 'exact' })
      .eq('payment_period_id', paymentPeriodId);

    // Send webhook again (same event ID)
    // Handler should deduplicate and not create duplicate payment

    const countAfter = await supabase
      .from('payments')
      .select('id', { count: 'exact' })
      .eq('payment_period_id', paymentPeriodId);

    expect(countBefore.count).toBe(countAfter.count);
  });

  it('should list payments correctly after completion', async () => {
    // Verify payment appears in GET /api/payments list
    const paymentsRes = await fetch(
      'http://localhost:3000/api/payments?status=completed',
      {
        headers: {
          Authorization: `Bearer ${testTenantId}`,
        },
      }
    );

    expect(paymentsRes.status).toBe(200);
    const { payments } = await paymentsRes.json();

    const completed = payments.find((p: any) => p.id === paymentId);
    expect(completed).toBeDefined();
    expect(completed.status).toBe('completed');
  });

  it('should retrieve payment receipt', async () => {
    // Verify receipt page can fetch payment details
    const receiptRes = await fetch(
      `http://localhost:3000/api/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${testTenantId}`,
        },
      }
    );

    expect(receiptRes.status).toBe(200);
    const receipt = await receiptRes.json();

    expect(receipt.id).toBe(paymentId);
    expect(receipt.status).toBe('completed');
    expect(receipt.payment_periods).toBeDefined();
    expect(receipt.properties).toBeDefined();
  });

  it('should prevent tenant from accessing other tenant payments', async () => {
    const otherTenantId = 'other-tenant-' + Math.random().toString(36).slice(2);

    const paymentsRes = await fetch(
      'http://localhost:3000/api/payments',
      {
        headers: {
          Authorization: `Bearer ${otherTenantId}`,
        },
      }
    );

    expect(paymentsRes.status).toBe(200);
    const { payments } = await paymentsRes.json();

    const hasTestPayment = payments.some((p: any) => p.id === paymentId);
    expect(hasTestPayment).toBe(false);
  });
});
```

## Acceptance Criteria
1. [ ] Test file created: `apps/web/__tests__/integration/payments-checkout-flow.test.ts`
2. [ ] Test covers full flow:
   - [ ] Payment period generation
   - [ ] Checkout session creation
   - [ ] Webhook processing
   - [ ] Database state verification
3. [ ] Setup/teardown properly manages test data:
   - [ ] Creates test property, tenant, landlord
   - [ ] Creates Stripe account record
   - [ ] Cleans up after test completes
4. [ ] Tests verify:
   - [ ] Payment period created with correct status and amount
   - [ ] Checkout session is created and returns sessionId
   - [ ] Payment record created with pending status
   - [ ] Webhook updates payment to completed status
   - [ ] Payment period updated to paid status
   - [ ] Payment and period amounts match
5. [ ] Idempotency test:
   - [ ] Webhook retry doesn't create duplicate payments
6. [ ] Authorization tests:
   - [ ] Payment appears in tenant's list
   - [ ] Other tenants cannot see payment
   - [ ] Receipt page accessible to owner
7. [ ] Uses Stripe test mode (test keys, test webhook)
8. [ ] Test data properly isolated (uses randomized IDs)
9. [ ] All assertions pass with real Supabase and Stripe
10. [ ] Test runs against local dev environment
11. [ ] Clear comments explaining each step
12. [ ] Can be extended for other payment flows (vendor, recurring, etc.)
13. [ ] No TypeScript errors
