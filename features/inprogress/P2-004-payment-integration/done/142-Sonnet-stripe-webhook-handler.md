---
id: 142
title: Stripe webhook handler — checkout.session.completed, account.updated events
tier: Sonnet
depends_on: [138, 139]
feature: P2-004-payment-integration
---

# 142 — Stripe webhook handler — checkout.session.completed, account.updated events

## Objective
Create POST /api/webhooks/stripe that verifies Stripe webhook signatures and handles two event types:
1. **checkout.session.completed** — Update payment record and mark payment_period as paid
2. **account.updated** — Sync connected account status (charges_enabled, payouts_enabled)

Handle idempotent webhook processing (Stripe may retry, so ensure safe re-processing).

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Stripe sends webhooks to confirm payment completion and account status changes. This route:
- Verifies webhook signature using STRIPE_WEBHOOK_SECRET
- Processes checkout.session.completed to mark rent paid
- Processes account.updated to keep payout status in sync
- Handles retries idempotently (using event ID deduplication)

## Implementation

**File**: `apps/web/app/api/webhooks/stripe/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple idempotency store (in production, use database or Redis)
const processedWebhooks = new Set<string>();

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Invalid signature', { status: 401 });
    }

    // Idempotency check: skip if already processed
    if (processedWebhooks.has(event.id)) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark webhook as processed
    processedWebhooks.add(event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const metadata = session.metadata;
    if (!metadata || !metadata.payment_period_id) {
      console.warn('Missing payment_period_id in checkout session metadata');
      return;
    }

    const { payment_period_id, tenant_id, property_id } = metadata;

    // Update payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        stripe_charge_id: session.payment_intent as string,
        paid_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', session.payment_intent as string);

    if (paymentError) {
      console.error('Failed to update payment:', paymentError);
      return;
    }

    // Update payment_period status
    const { error: periodError } = await supabase
      .from('payment_periods')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment_period_id);

    if (periodError) {
      console.error('Failed to update payment_period:', periodError);
      return;
    }

    console.log(`Payment completed for period ${payment_period_id}`);
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  try {
    // Find stripe_account record by stripe_account_id
    const { data: stripeAccount, error: fetchError } = await supabase
      .from('stripe_accounts')
      .select('id, property_id')
      .eq('stripe_account_id', account.id)
      .single();

    if (fetchError || !stripeAccount) {
      console.warn(`Stripe account ${account.id} not found in database`);
      return;
    }

    // Update charges_enabled and payouts_enabled
    const { error: updateError } = await supabase
      .from('stripe_accounts')
      .update({
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
      })
      .eq('id', stripeAccount.id);

    if (updateError) {
      console.error('Failed to update stripe_account:', updateError);
      return;
    }

    console.log(
      `Stripe account ${account.id} updated: charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`
    );
  } catch (error) {
    console.error('Error handling account.updated:', error);
  }
}
```

## Acceptance Criteria
1. [ ] POST /api/webhooks/stripe created at `apps/web/app/api/webhooks/stripe/route.ts`
2. [ ] Route is excluded from Clerk auth in middleware (task 154)
3. [ ] Verifies Stripe webhook signature using stripe.webhooks.constructEvent
4. [ ] Returns 401 if signature is invalid
5. [ ] Handles checkout.session.completed:
   - [ ] Extracts payment_period_id from metadata
   - [ ] Updates payments table: status = 'completed', paid_at = now
   - [ ] Updates payment_periods table: status = 'paid', paid_at = now
6. [ ] Handles account.updated:
   - [ ] Finds stripe_account by stripe_account_id
   - [ ] Updates charges_enabled and payouts_enabled
7. [ ] Implements idempotency (same webhook event processed only once)
8. [ ] Returns { received: true } for valid webhooks
9. [ ] Handles errors gracefully (missing metadata, invalid data)
10. [ ] Logs all major steps and errors
11. [ ] No TypeScript errors
12. [ ] Works with Stripe test mode webhooks
13. [ ] Integration test (task 157) covers full flow
