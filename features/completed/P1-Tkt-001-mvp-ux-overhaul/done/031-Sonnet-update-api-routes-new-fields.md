---
id: 031
title: Update API routes to accept and persist new property/tenant/vendor fields
tier: Sonnet
depends_on: [25, 26]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 031 — Update API Routes for New Fields

## Objective

Update existing property, tenant, and vendor API routes to accept, validate, and persist the new fields (apt_or_unit_no, lease fields, custom_fields, priority_rank).

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — "API Routes" integration section. Follow the existing API pattern in `apps/web/app/api/` — auth check → Zod validation → Supabase query → JSON response.

## Implementation

### 1. Properties API (`apps/web/app/api/properties/route.ts`)
- POST: Accept `apt_or_unit_no` in body, pass to Supabase insert
- GET: Include `apt_or_unit_no` in select query

### 2. Properties [id] API (`apps/web/app/api/properties/[id]/route.ts`)
- PATCH/PUT: Accept `apt_or_unit_no`, pass to Supabase update

### 3. Tenants API (`apps/web/app/api/properties/[id]/tenants/route.ts`)
- POST: Accept `move_in_date`, `lease_type`, `lease_start_date`, `lease_end_date`, `rent_due_day`, `custom_fields`
- Phone arrives as digits-only (formatting is client-side)

### 4. Tenant [id] API (`apps/web/app/api/tenants/[id]/route.ts`)
- GET: Include new lease fields in response
- PATCH: Accept and persist all new fields

### 5. Vendors API (`apps/web/app/api/vendors/route.ts`)
- POST: Accept `priority_rank`, `custom_fields`

### 6. Vendor [id] API (`apps/web/app/api/vendors/[id]/route.ts`)
- PATCH: Accept `priority_rank`, `custom_fields`

All routes use the updated Zod schemas from task 026. All new fields are optional, so existing callers continue to work.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Properties POST/PATCH accepts and persists `apt_or_unit_no`
3. [ ] Tenants POST accepts all new lease fields + `custom_fields`
4. [ ] Tenants PATCH accepts and persists all new fields
5. [ ] Vendors POST/PATCH accepts `priority_rank` and `custom_fields`
6. [ ] Existing API callers not broken (all new fields optional)
7. [ ] Zod validation applied to all new fields
8. [ ] Error responses follow existing patterns
