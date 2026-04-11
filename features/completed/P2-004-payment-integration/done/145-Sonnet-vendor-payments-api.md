---
id: 145
title: Vendor payments API routes — POST create, GET list
tier: Sonnet
depends_on: [138]
feature: P2-004-payment-integration
---

# 145 — Vendor payments API routes — POST create, GET list

## Objective
Create two API routes for vendor payment logging:
1. **POST /api/payments/vendor** — Create a vendor payment record
2. **GET /api/payments/vendor** — List vendor payments (landlord only)

Vendor payments are manually logged by landlords to track maintenance spending (e.g., contractor invoices, parts, etc.). These can optionally be linked to maintenance requests.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Landlords log vendor payments to:
- Track cumulative maintenance spending per property
- Link payments to specific maintenance requests
- Build financial reports (included in financial summary)

## Implementation

### 1. POST /api/payments/vendor

**File**: `apps/web/app/api/payments/vendor/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

interface CreateVendorPaymentRequest {
  property_id: string;
  vendor_name: string;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  description?: string;
  request_id?: string; // Link to maintenance request
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const body: CreateVendorPaymentRequest = await req.json();
    const { property_id, vendor_name, amount, payment_date, description, request_id } = body;

    // Validate required fields
    if (!property_id || !vendor_name || !amount || !payment_date) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Verify landlord owns this property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .eq('landlord_id', userId)
      .single();

    if (propertyError || !property) {
      return new Response('Property not found or unauthorized', { status: 403 });
    }

    // Optional: verify request_id belongs to same property
    if (request_id) {
      const { data: request } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('id', request_id)
        .eq('property_id', property_id)
        .single();

      if (!request) {
        return new Response('Maintenance request not found for this property', { status: 404 });
      }
    }

    // Create vendor payment record
    const { data: vendorPayment, error: insertError } = await supabase
      .from('vendor_payments')
      .insert({
        property_id,
        vendor_name,
        amount,
        payment_date,
        description: description || null,
        request_id: request_id || null,
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create vendor payment:', insertError);
      return new Response('Failed to create vendor payment', { status: 500 });
    }

    return new Response(JSON.stringify(vendorPayment), {
      headers: { 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    console.error('Vendor payment creation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

### 2. GET /api/payments/vendor

**File**: `apps/web/app/api/payments/vendor/route.ts` (same file, GET handler)

```typescript
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const url = new URL(req.url);
    const propertyId = url.searchParams.get('property_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Verify landlord owns the property (if filtering by property_id)
    if (propertyId) {
      const { data: property } = await supabase
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .eq('landlord_id', userId)
        .single();

      if (!property) {
        return new Response('Property not found or unauthorized', { status: 403 });
      }
    }

    // Build query
    let query = supabase
      .from('vendor_payments')
      .select(
        `
        id,
        property_id,
        vendor_name,
        amount,
        payment_date,
        description,
        request_id,
        created_at,
        created_by,
        maintenance_requests (
          id,
          title,
          status
        )
        `,
        { count: 'exact' }
      );

    // Filter by property (if provided) or get all landlord's properties
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    } else {
      // Get all vendor payments for landlord's properties
      const { data: landlordProperties } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', userId);

      const propertyIds = landlordProperties?.map((p) => p.id) || [];
      if (propertyIds.length === 0) {
        return new Response(JSON.stringify({ payments: [], total: 0 }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      query = query.in('property_id', propertyIds);
    }

    // Execute query
    const { data: payments, error, count } = await query
      .order('payment_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Vendor payments fetch error:', error);
      return new Response('Failed to fetch vendor payments', { status: 500 });
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
    console.error('Vendor payments API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

## Acceptance Criteria
1. [ ] POST /api/payments/vendor created at `apps/web/app/api/payments/vendor/route.ts`
2. [ ] GET /api/payments/vendor created in same file
3. [ ] POST route requires Clerk authentication
4. [ ] GET route requires Clerk authentication (landlord only)
5. [ ] POST accepts JSON body with:
   - [ ] property_id (required)
   - [ ] vendor_name (required)
   - [ ] amount (required, numeric)
   - [ ] payment_date (required, YYYY-MM-DD)
   - [ ] description (optional)
   - [ ] request_id (optional, links to maintenance_requests)
6. [ ] POST verifies landlord owns the property
7. [ ] POST verifies request_id belongs to same property (if provided)
8. [ ] POST returns 201 with created vendor payment
9. [ ] GET supports filtering by property_id
10. [ ] GET supports pagination (limit, offset)
11. [ ] GET enforces landlord-only access (can only see own properties)
12. [ ] GET returns payments joined with maintenance_requests (title, status)
13. [ ] GET returns pagination metadata (total, limit, offset)
14. [ ] No TypeScript errors
15. [ ] Unit tests (task 156) cover happy path and error cases
