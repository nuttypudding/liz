---
id: 234
title: "Tenant rent API route — GET /api/tenant/rent"
tier: Sonnet
depends_on: ["231", "232"]
feature: P2-001-rent-reminder
---

# 234 — Tenant Rent API Route

## Objective

Implement `GET /api/tenant/rent` so tenants can view their own rent periods (current status and history).

## Context

Tenants see their rent status on a dedicated page. This route returns only the authenticated tenant's rent periods, never other tenants' data.

Follow the existing API pattern: Clerk auth, `getRole()` check for tenant role, Supabase server client. See how `GET /api/payments` handles tenant filtering for reference.

## Implementation

### `GET /api/tenant/rent`
- Auth: Clerk + tenant role
- Look up the tenant record by `clerk_user_id = userId`
- Query `rent_periods` where `tenant_id = tenant.id`
- Join `properties` (name, address) for display
- Sort by `period_month DESC` (newest first)
- Return `{ data: RentPeriod[] }`
- Return empty array (not error) if tenant has no rent periods

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Route returns only the authenticated tenant's rent periods
3. [ ] Periods are sorted newest-first by `period_month`
4. [ ] Property info is joined for display context
5. [ ] Returns 401 for unauthenticated requests
6. [ ] Returns 403 for landlord role (tenant-only endpoint)
7. [ ] Returns empty array (not error) when no periods exist
8. [ ] All tests pass
