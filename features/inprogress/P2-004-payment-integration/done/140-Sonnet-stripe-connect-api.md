---
id: 140
title: Stripe Connect API routes — onboard, status, account webhook handler
tier: Sonnet
depends_on: [138, 139]
feature: P2-004-payment-integration
---

# 140 — Stripe Connect API routes — onboard, status, account webhook handler

## Objective
Create two API routes that handle Stripe Connect onboarding for landlords, and implement the account.updated webhook handler to sync account status.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Stripe Connect allows landlords to receive payments directly into their own Stripe accounts. The API routes:
1. **GET /api/payments/connect/onboard** — Generate Stripe Account Link (OAuth flow)
2. **GET /api/payments/connect/status** — Check if landlord's account is connected and ready
3. **POST /api/webhooks/stripe** (partial) — Handle account.updated webhook to track payout readiness

## Implementation

### 1. GET /api/payments/connect/onboard

**File**: `apps/web/app/api/payments/connect/onboard/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req: Request) {
  // Auth check: must be authenticated landlord
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    // Get landlord's primary property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', userId)
      .single();

    if (propertyError || !property) {
      return new Response('No property found', { status: 404 });
    }

    // Check if stripe_account already exists for this property
    const { data: existingAccount } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id')
      .eq('property_id', property.id)
      .single();

    let stripeAccountId = existingAccount?.stripe_account_id;

    // Create new Stripe Account if not exists
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: 'placeholder@example.com', // Will be updated via webhook
      });
      stripeAccountId = account.id;

      // Save to database
      await supabase.from('stripe_accounts').insert({
        property_id: property.id,
        stripe_account_id: stripeAccountId,
      });
    }

    // Generate Account Link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: 'account_onboarding',
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?connected=true`,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?refresh=true`,
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stripe Connect onboard error:', error);
    return new Response('Failed to create account link', { status: 500 });
  }
}
```

### 2. GET /api/payments/connect/status

**File**: `apps/web/app/api/payments/connect/status/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', userId)
      .single();

    if (!property) {
      return new Response(JSON.stringify({ connected: false, charges_enabled: false }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled')
      .eq('property_id', property.id)
      .single();

    if (!stripeAccount) {
      return new Response(JSON.stringify({ connected: false, charges_enabled: false }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch current account status from Stripe
    const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id);

    return new Response(
      JSON.stringify({
        connected: true,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Stripe Connect status error:', error);
    return new Response('Failed to fetch account status', { status: 500 });
  }
}
```

### 3. account.updated webhook handler (part of task 142)

This task focuses on the two routes above. The webhook handler is covered in task 142.

## Acceptance Criteria
1. [ ] GET /api/payments/connect/onboard created at `apps/web/app/api/payments/connect/onboard/route.ts`
2. [ ] GET /api/payments/connect/status created at `apps/web/app/api/payments/connect/status/route.ts`
3. [ ] Both routes require Clerk authentication
4. [ ] onboard route creates Stripe Express account if not exists
5. [ ] onboard route saves stripe_account_id to database
6. [ ] onboard route returns valid Stripe Account Link URL
7. [ ] status route returns { connected, charges_enabled, payouts_enabled, requirements }
8. [ ] Routes handle missing properties gracefully (return 404 or false status)
9. [ ] Environment variables STRIPE_SECRET_KEY, NEXT_PUBLIC_APP_URL are used
10. [ ] No TypeScript errors
11. [ ] Unit tests cover happy path and error cases (in task 156)
