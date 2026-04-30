---
id: 055
title: Update tenant API routes to accept and return lease fields
tier: Sonnet
depends_on: [25, 26]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 055 — Tenant API: Lease Fields

## Objective

Update tenant API routes to accept, validate, and return the new lease fields (lease_type, lease_start_date, lease_end_date, rent_due_day, move_in_date).

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "Modified API Routes" and "Integration Points" sections.

## Implementation

### 1. POST `/api/properties/[id]/tenants/route.ts`
- Accept: `lease_type`, `lease_start_date`, `lease_end_date`, `rent_due_day`, `move_in_date`
- All optional — existing callers not broken

### 2. PATCH `/api/tenants/[id]/route.ts`
- Accept and persist all lease fields

### 3. GET `/api/tenants/[id]/route.ts`
- Include lease fields in response

All changes are additive. Use updated `tenantSchema` from task 026.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] POST accepts all lease fields
3. [ ] PATCH updates lease fields
4. [ ] GET returns lease fields
5. [ ] Existing callers not broken (all new fields optional)
6. [ ] Zod validation applied
