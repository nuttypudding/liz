---
id: 066
title: Utility GET + PUT API routes — /api/properties/[id]/utilities
tier: Sonnet
depends_on: [25, 26]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 066 — Utility GET + PUT API Routes

## Objective

Build the GET and PUT endpoints for fetching and upserting utility info per property.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/utility-company-integration.md` — "New API Routes" and "Middleware/Auth" sections.

## Implementation

Create `apps/web/app/api/properties/[id]/utilities/route.ts`:

### GET
1. Auth check (landlord or tenant of property)
2. Query `property_utilities WHERE property_id = ?`
3. **Tenant role**: omit `account_number`, omit rows with `status = 'not_applicable'`
4. **Landlord role**: return all fields
5. Order by utility_type

### PUT
1. Auth check (landlord only)
2. Validate body with `utilityUpsertSchema`
3. Upsert rows (ON CONFLICT (property_id, utility_type) DO UPDATE)
4. Return updated records

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] GET returns utility data for property
3. [ ] Tenant view omits account_number and N/A rows
4. [ ] Landlord view returns everything
5. [ ] PUT upserts all utility types
6. [ ] Zod validation applied
7. [ ] Auth checks enforced
