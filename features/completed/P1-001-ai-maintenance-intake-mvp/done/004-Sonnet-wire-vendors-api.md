---
id: 004
title: Wire vendors API routes to Supabase
tier: Sonnet
depends_on: [1]
feature: ai-maintenance-intake-mvp
---

# 004 — Wire Vendors API Routes to Supabase

## Objective

Replace mock responses in vendor API routes with real Supabase queries. After this task, landlords can manage their preferred vendor contacts.

## Context

- Supabase `vendors` table exists after task 001
- Existing route stubs at:
  - `apps/web/app/api/vendors/route.ts` — GET (list), POST (create)
  - `apps/web/app/api/vendors/[id]/route.ts` — PATCH, DELETE
- Zod schema: `vendorSchema` from `@/lib/validations`
  - Fields: name, phone, email, specialty (enum: plumbing|electrical|hvac|structural|pest|appliance|general), notes
- Access pattern: filter `vendors.landlord_id = userId`

## Implementation

### GET /api/vendors

```typescript
const { userId } = await auth();
const supabase = createServerSupabaseClient();
const { data, error } = await supabase
  .from("vendors")
  .select("*")
  .eq("landlord_id", userId)
  .order("name");
return NextResponse.json({ vendors: data });
```

### POST /api/vendors

Validate body with `vendorSchema`, insert with `landlord_id = userId`.

### PATCH /api/vendors/[id]

Validate with `vendorSchema.partial()`, verify ownership via `landlord_id`, update.

### DELETE /api/vendors/[id]

Verify ownership, delete. Note: if a vendor is referenced by `maintenance_requests.vendor_id`, either set to null or block deletion.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] GET /api/vendors returns real vendors for the authenticated landlord
3. [ ] POST /api/vendors creates a vendor with correct specialty enum
4. [ ] PATCH /api/vendors/[id] updates vendor fields
5. [ ] DELETE /api/vendors/[id] removes or soft-deletes a vendor
6. [ ] Ownership enforcement: can't access another landlord's vendors
7. [ ] Proper error responses (400, 401, 403, 404)
