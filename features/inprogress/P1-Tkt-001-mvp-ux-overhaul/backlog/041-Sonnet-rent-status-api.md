---
id: 041
title: Rent status API — GET /api/properties/[id]/rent-status
tier: Sonnet
depends_on: [25, 26]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 041 — Rent Status API

## Objective

Build the GET `/api/properties/[id]/rent-status` endpoint that returns rent payment status for a property (amount, last paid, overdue status).

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Rent Status API" integration section.

## Implementation

Create `apps/web/app/api/properties/[id]/rent-status/route.ts`:

1. Auth check via Clerk
2. Fetch property's `monthly_rent` and `rent_due_day`
3. Fetch most recent `rent_payments` record for this property
4. Determine overdue status: check if any payment covers the current period (based on `period_start`/`period_end` and today's date vs. `rent_due_day`)
5. Return `RentStatus` object:
```typescript
{
  property_id, monthly_rent, rent_due_day,
  last_paid_at, last_paid_amount,
  is_overdue, days_overdue
}
```

Follow existing API pattern in `apps/web/app/api/dashboard/stats/route.ts`.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Endpoint returns correct RentStatus shape
3. [ ] `is_overdue` correctly computed from rent_due_day and payment history
4. [ ] `days_overdue` is 0 when rent is current
5. [ ] Property with no payments shows overdue (if past due day)
6. [ ] Auth check prevents unauthorized access
7. [ ] 404 for non-existent property
