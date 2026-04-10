---
id: 080
title: Create billing API route or client-side data fetch for plan/usage info
tier: Sonnet
depends_on: [75]
feature: P1-002-clerk-auth
---

# 080 — Billing API Route / Data Fetch

## Objective

Create the backend that provides plan and usage data for the billing page. For MVP, this returns static "Free Beta" plan info and actual usage counts (properties, requests this month).

## Context

See feature plan: `features/inprogress/P1-002-clerk-auth/README.md` — "Billing" section.

Clerk Billing requires a paid Clerk plan. For MVP, we return static plan info and real usage from Supabase. When Clerk Billing is configured later, this route can be updated to pull plan data from Clerk session claims.

## Implementation

### 1. Create `apps/web/app/api/billing/route.ts`

```typescript
import { withAuth } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const GET = withAuth(async (userId) => {
  const supabase = createServerSupabaseClient();

  // Count landlord's properties
  const { count: propertiesCount } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("landlord_id", userId);

  // Count maintenance requests this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: requestsCount } = await supabase
    .from("maintenance_requests")
    .select("*", { count: "exact", head: true })
    .eq("landlord_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  return NextResponse.json({
    plan: {
      id: "free_beta",
      name: "Free (Beta)",
      price_monthly: 0,
      limits: { properties: 3, requests_per_month: 20 },
      status: "active",
    },
    usage: {
      properties_count: propertiesCount ?? 0,
      properties_limit: 3,
      requests_this_month: requestsCount ?? 0,
      requests_limit: 20,
    },
  });
}, { requiredRole: "landlord" });
```

### 2. Add TypeScript types

Add `BillingPlan` and `BillingUsage` interfaces to `apps/web/lib/types.ts`:

```typescript
export interface BillingPlan {
  id: string;
  name: string;
  price_monthly: number;
  limits: { properties: number; requests_per_month: number };
  status: "active" | "coming_soon";
}

export interface BillingUsage {
  properties_count: number;
  properties_limit: number;
  requests_this_month: number;
  requests_limit: number;
  plan: BillingPlan;
}
```

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] `GET /api/billing` returns plan info + usage data
3. [ ] Uses `withAuth()` with `requiredRole: "landlord"`
4. [ ] Returns 401 for unauthenticated, 403 for non-landlord
5. [ ] Properties count matches actual landlord properties
6. [ ] Requests count is for current month only
7. [ ] Static "Free Beta" plan data returned
8. [ ] TypeScript types added for billing data
