---
id: 141
title: Stripe Checkout API route — create checkout session for rent payment
tier: Sonnet
depends_on: [138, 139, 140]
feature: P2-004-payment-integration
---

# 141 — Stripe Checkout API route — create checkout session for rent payment

## Objective
Create POST /api/payments/checkout that generates a Stripe Checkout Session for tenants to pay rent. The session must include landlord's connected account, metadata linking to payment period, and success/cancel URLs.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

When a tenant clicks "Pay Rent" on /pay, the frontend calls this route to:
1. Create a Checkout Session with amount from payment_period
2. Include landlord's Stripe connected account (on_behalf_of)
3. Store payment_period_id and property_id in metadata
4. Return checkout session URL for client-side redirect

## Implementation

**File**: `apps/web/app/api/payments/checkout/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

interface CheckoutRequest {
  payment_period_id: string;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const body: CheckoutRequest = await req.json();
    const { payment_period_id } = body;

    // Get payment period details
    const { data: paymentPeriod, error: periodError } = await supabase
      .from('payment_periods')
      .select('id, property_id, tenant_id, rent_amount, month, year')
      .eq('id', payment_period_id)
      .single();

    if (periodError || !paymentPeriod) {
      return new Response('Payment period not found', { status: 404 });
    }

    // Get tenant info for metadata
    const { data: tenant } = await supabase
      .auth
      .admin
      .getUserById(paymentPeriod.tenant_id);

    // Get property and landlord info
    const { data: property } = await supabase
      .from('properties')
      .select('id, landlord_id, name')
      .eq('id', paymentPeriod.property_id)
      .single();

    if (!property) {
      return new Response('Property not found', { status: 404 });
    }

    // Get landlord's connected Stripe account
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, charges_enabled')
      .eq('property_id', property.id)
      .single();

    if (!stripeAccount || !stripeAccount.charges_enabled) {
      return new Response('Landlord Stripe account not ready', { status: 400 });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Rent - ${property.name} (${paymentPeriod.month}/${paymentPeriod.year})`,
              description: `Payment for ${tenant?.email || 'tenant'}`,
            },
            unit_amount: Math.round(paymentPeriod.rent_amount * 100), // cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay?canceled=true`,
      customer_email: tenant?.email,
      client_reference_id: paymentPeriod.tenant_id, // Links back to tenant
      metadata: {
        payment_period_id: paymentPeriod.id,
        property_id: property.id,
        tenant_id: paymentPeriod.tenant_id,
        month: paymentPeriod.month.toString(),
        year: paymentPeriod.year.toString(),
      },
      on_behalf_of: stripeAccount.stripe_account_id,
    });

    // Create initial payment record (status: pending)
    await supabase.from('payments').insert({
      payment_period_id: paymentPeriod.id,
      tenant_id: paymentPeriod.tenant_id,
      property_id: paymentPeriod.property_id,
      amount: paymentPeriod.rent_amount,
      stripe_payment_intent_id: session.payment_intent as string || null,
      status: 'pending',
      metadata: {
        checkout_session_id: session.id,
      },
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return new Response('Failed to create checkout session', { status: 500 });
  }
}
```

## Acceptance Criteria
1. [ ] POST /api/payments/checkout created at `apps/web/app/api/payments/checkout/route.ts`
2. [ ] Route requires Clerk authentication
3. [ ] Accepts JSON body with payment_period_id
4. [ ] Fetches payment_period and validates it exists
5. [ ] Fetches landlord's Stripe account and verifies charges_enabled
6. [ ] Creates Stripe Checkout Session with correct line items (amount in cents)
7. [ ] Sets on_behalf_of to landlord's connected account
8. [ ] Includes metadata: payment_period_id, property_id, tenant_id, month, year
9. [ ] success_url points to /pay/success with {CHECKOUT_SESSION_ID}
10. [ ] cancel_url points to /pay with canceled=true
11. [ ] Creates payment record with status: pending before returning session
12. [ ] Returns JSON with sessionId
13. [ ] Handles errors gracefully (missing payment period, not connected, etc.)
14. [ ] No TypeScript errors
15. [ ] Works with Stripe test mode
