---
id: 233
title: "Rent period API routes — GET /api/rent, PATCH /api/rent/[id], POST /api/rent/generate"
tier: Sonnet
depends_on: ["231", "232"]
feature: P2-001-rent-reminder
---

# 233 — Rent Period API Routes

## Objective

Implement three API routes for landlord rent period management: listing rent periods (with filters), updating a rent period (mark paid), and generating rent periods for a month.

## Context

These routes power the landlord Rent Schedule page. Follow the existing API route patterns in `apps/web/app/api/` — Clerk auth, role verification via `getRole()`, Supabase server client.

**Note**: An existing `/api/payments/` route and `/api/properties/[id]/rent-status/` route may exist from prior work. The new routes use the `rent_periods` table (task 231) and follow the feature plan's API design. Check for overlap and reuse logic where possible.

See feature plan: Architecture > New API Routes section.

## Implementation

### `GET /api/rent`
- Auth: Clerk + landlord role
- Query params: `month` (YYYY-MM), `property_id`, `status`
- Query `rent_periods` filtered by `landlord_id = userId`, with optional month/property/status filters
- Join `tenants` (name, email, unit_number) and `properties` (name, address)
- Sort by property name, then tenant name
- Return `{ data: RentPeriod[] }`

### `PATCH /api/rent/[id]`
- Auth: Clerk + landlord role
- Body: `{ status?, amount_paid?, paid_date?, payment_notes? }`
- Validate the rent period belongs to this landlord
- If `amount_paid >= amount`, set status to `'paid'`; if `0 < amount_paid < amount`, set status to `'partial'`
- Update the row, return updated `RentPeriod`

### `POST /api/rent/generate`
- Auth: Clerk + landlord role
- Body: `{ month: string }` (YYYY-MM format)
- For each property owned by the landlord, find all active tenants
- For each tenant, check if a `rent_periods` row exists for this month (use unique index)
- If not, create one with `status = 'upcoming'`, `amount = property.monthly_rent`, `due_date` calculated from `property.rent_due_day`
- Return `{ created: number, existing: number }`

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] `GET /api/rent` returns filtered, joined rent periods for the authenticated landlord
3. [ ] `PATCH /api/rent/[id]` updates status and payment fields with ownership validation
4. [ ] `POST /api/rent/generate` creates rent periods for all active tenants, skipping duplicates
5. [ ] All routes return 401 for unauthenticated requests
6. [ ] All routes return 403 for non-landlord roles
7. [ ] Input validation with appropriate error responses
8. [ ] All tests pass
