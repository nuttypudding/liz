---
id: 003
title: Wire properties and tenants API routes to Supabase
tier: Sonnet
depends_on: [1]
feature: ai-maintenance-intake-mvp
---

# 003 — Wire Properties and Tenants API Routes to Supabase

## Objective

Replace mock responses in property and tenant API routes with real Supabase queries. After this task, landlords can create, read, update, and delete properties and tenants via the API.

## Context

- Supabase tables exist after task 001: `properties`, `tenants`
- Existing route stubs at:
  - `apps/web/app/api/properties/route.ts` — GET (list), POST (create)
  - `apps/web/app/api/properties/[id]/route.ts` — GET, PATCH, DELETE
  - `apps/web/app/api/properties/[id]/tenants/route.ts` — POST (add tenant)
  - `apps/web/app/api/tenants/[id]/route.ts` — PATCH, DELETE
- Supabase server client: `import { createServerSupabaseClient } from "@/lib/supabase/server"`
- Auth helpers: `import { getRole } from "@/lib/clerk"` and `auth()` from `@clerk/nextjs/server`
- Zod schemas: `propertySchema`, `tenantSchema` from `@/lib/validations`
- Access pattern: `auth()` for userId → filter `properties.landlord_id = userId`

## Implementation

### API Route: GET /api/properties

```typescript
const { userId } = await auth();
const supabase = createServerSupabaseClient();
const { data, error } = await supabase
  .from("properties")
  .select("*, tenants(*)")
  .eq("landlord_id", userId)
  .order("created_at", { ascending: false });
```

### API Route: POST /api/properties

```typescript
const parsed = propertySchema.safeParse(body);
const { data, error } = await supabase
  .from("properties")
  .insert({ ...parsed.data, landlord_id: userId })
  .select()
  .single();
```

### API Route: GET /api/properties/[id]

```typescript
const { id } = await params;
const { data, error } = await supabase
  .from("properties")
  .select("*, tenants(*)")
  .eq("id", id)
  .eq("landlord_id", userId)
  .single();
```

### API Route: PATCH /api/properties/[id]

Validate with `propertySchema.partial()`, update, verify ownership.

### API Route: DELETE /api/properties/[id]

Verify ownership, then delete. Cascade deletes tenants (or handle manually).

### API Route: POST /api/properties/[id]/tenants

Validate with `tenantSchema`, verify property ownership, insert tenant with `property_id`.

### API Route: PATCH /api/tenants/[id]

Join through property to verify landlord ownership before updating.

### API Route: DELETE /api/tenants/[id]

Join through property to verify landlord ownership before deleting.

### Error handling pattern

```typescript
if (error) {
  console.error("Supabase error:", error);
  return NextResponse.json({ error: "Database error" }, { status: 500 });
}
if (!data) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] GET /api/properties returns real properties for the authenticated landlord
3. [ ] POST /api/properties creates a new property in Supabase
4. [ ] GET /api/properties/[id] returns a single property with tenants
5. [ ] PATCH /api/properties/[id] updates property fields
6. [ ] DELETE /api/properties/[id] removes the property
7. [ ] POST /api/properties/[id]/tenants adds a tenant to a property
8. [ ] PATCH /api/tenants/[id] updates tenant fields
9. [ ] DELETE /api/tenants/[id] removes a tenant
10. [ ] All routes verify landlord ownership (can't access another landlord's data)
11. [ ] All routes return proper error responses for invalid input (400), unauthorized (401), forbidden (403), not found (404)
12. [ ] Zod validation is used for all request bodies
