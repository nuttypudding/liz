---
id: 144
title: Payments API routes — GET list, GET single, receipt data
tier: Sonnet
depends_on: [138]
feature: P2-004-payment-integration
---

# 144 — Payments API routes — GET list, GET single, receipt data

## Objective
Create two API routes that fetch payment records:
1. **GET /api/payments** — List all payments (filterable by tenant, landlord context)
2. **GET /api/payments/[id]** — Fetch single payment with receipt data (Stripe details)

Both routes enforce RLS: tenants see only their own payments, landlords see all tenant payments for their properties.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

These routes provide payment data to:
- Tenant /pay page (current + past payments)
- Landlord dashboard (payment table, filtering)
- Receipt page (single payment detail with Stripe info)

## Implementation

### 1. GET /api/payments

**File**: `apps/web/app/api/payments/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenant_id');
    const propertyId = url.searchParams.get('property_id');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Determine user role (simple check: if user has properties, they're a landlord)
    const { data: landlordProperties } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', userId);

    const isLandlord = landlordProperties && landlordProperties.length > 0;

    let query = supabase
      .from('payments')
      .select(
        `
        id,
        amount,
        status,
        paid_at,
        created_at,
        tenant_id,
        property_id,
        payment_period_id,
        stripe_charge_id,
        payment_method,
        payment_periods (
          month,
          year,
          due_date
        ),
        properties (
          name
        )
        `,
        { count: 'exact' }
      );

    // Apply filters based on role
    if (isLandlord) {
      // Landlord: filter by their properties
      const propertyIds = landlordProperties.map((p) => p.id);
      query = query.in('property_id', propertyIds);

      // Optional: further filter by specific property or tenant
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
    } else {
      // Tenant: only their own payments
      query = query.eq('tenant_id', userId);
    }

    // Status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Pagination
    const { data: payments, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Payments fetch error:', error);
      return new Response('Failed to fetch payments', { status: 500 });
    }

    return new Response(
      JSON.stringify({
        payments,
        total: count,
        limit,
        offset,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payments API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

### 2. GET /api/payments/[id]

**File**: `apps/web/app/api/payments/[id]/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const paymentId = params.id;

    // Fetch payment with all related data
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(
        `
        id,
        amount,
        status,
        paid_at,
        created_at,
        tenant_id,
        property_id,
        payment_period_id,
        stripe_charge_id,
        stripe_payment_intent_id,
        payment_method,
        metadata,
        payment_periods (
          id,
          month,
          year,
          due_date,
          rent_amount,
          status
        ),
        properties (
          id,
          name,
          address
        )
        `
      )
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return new Response('Payment not found', { status: 404 });
    }

    // Check authorization
    const isOwner = payment.tenant_id === userId;
    const { data: isLandlord } = await supabase
      .from('properties')
      .select('id')
      .eq('id', payment.property_id)
      .eq('landlord_id', userId)
      .single();

    if (!isOwner && !isLandlord) {
      return new Response('Forbidden', { status: 403 });
    }

    // Fetch Stripe charge details if available (optional, for receipts)
    let stripeDetails = null;
    if (payment.stripe_charge_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        stripeDetails = await stripe.charges.retrieve(payment.stripe_charge_id);
      } catch (err) {
        console.warn('Failed to fetch Stripe details:', err);
      }
    }

    // Build receipt object
    const receipt = {
      ...payment,
      stripe_details: stripeDetails ? {
        charge_id: stripeDetails.id,
        amount: stripeDetails.amount / 100,
        currency: stripeDetails.currency.toUpperCase(),
        payment_method: stripeDetails.payment_method_details?.card?.brand,
        last4: stripeDetails.payment_method_details?.card?.last4,
        receipt_url: stripeDetails.receipt_url,
      } : null,
    };

    return new Response(JSON.stringify(receipt), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Payment detail error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

## Acceptance Criteria
1. [ ] GET /api/payments created at `apps/web/app/api/payments/route.ts`
2. [ ] GET /api/payments/[id] created at `apps/web/app/api/payments/[id]/route.ts`
3. [ ] Both routes require Clerk authentication
4. [ ] List route supports filtering:
   - [ ] tenant_id (for landlords to view specific tenant)
   - [ ] property_id (for landlords)
   - [ ] status (completed, pending, failed)
5. [ ] List route supports pagination (limit, offset)
6. [ ] List route enforces RLS:
   - [ ] Tenants see only their own payments
   - [ ] Landlords see all payments for their properties
7. [ ] Single payment route fetches full details including:
   - [ ] payment_periods joined data (month, year, due_date)
   - [ ] properties joined data (name, address)
   - [ ] Optional Stripe charge details
8. [ ] Single payment route enforces authorization:
   - [ ] Tenant can only see their own
   - [ ] Landlord can only see for their properties
9. [ ] Returns 404 if payment not found
10. [ ] Returns 403 if user not authorized
11. [ ] List response includes pagination metadata (total, limit, offset)
12. [ ] No TypeScript errors
13. [ ] Unit tests (task 156) cover authorization edge cases
