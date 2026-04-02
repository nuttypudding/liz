---
id: 005
title: Wire requests list and detail API routes to Supabase
tier: Sonnet
depends_on: [1]
feature: ai-maintenance-intake-mvp
---

# 005 — Wire Requests List and Detail API Routes to Supabase

## Objective

Replace mock responses in the requests API routes with real Supabase queries. Supports both landlord and tenant access patterns.

## Context

- Supabase `maintenance_requests` table exists after task 001
- Existing route stubs:
  - `apps/web/app/api/requests/route.ts` — GET (list, role-filtered)
  - `apps/web/app/api/requests/[id]/route.ts` — GET (detail), PATCH (update)
- Mock data shape from `lib/mock-data.ts`: id, tenant_message, ai_category, ai_urgency, ai_recommended_action, ai_cost_estimate_low, ai_cost_estimate_high, ai_confidence_score, status, property_id, property_name, tenant_name, created_at, vendor_name, actual_cost
- Access patterns:
  - **Landlord**: sees requests for properties they own (join maintenance_requests → properties where landlord_id = userId)
  - **Tenant**: sees their own requests (where tenant clerk_user_id = userId, via tenants table join)
- Query params for filtering: `property`, `urgency`, `status`

## Implementation

### GET /api/requests

```typescript
const role = await getRole();
const supabase = createServerSupabaseClient();

let query = supabase
  .from("maintenance_requests")
  .select(`
    *,
    properties!inner(id, name, landlord_id, address),
    tenants(id, name, email, phone, unit_number),
    vendors(id, name, phone, email, specialty),
    request_photos(id, storage_path, file_type)
  `)
  .order("created_at", { ascending: false });

if (role === "landlord") {
  query = query.eq("properties.landlord_id", userId);
} else {
  // Tenant: find their tenant record first, then filter
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  query = query.eq("tenant_id", tenant?.id);
}

// Apply optional filters from query params
const { searchParams } = new URL(request.url);
const property = searchParams.get("property");
const urgency = searchParams.get("urgency");
const status = searchParams.get("status");
if (property) query = query.eq("property_id", property);
if (urgency) query = query.eq("ai_urgency", urgency);
if (status) query = query.eq("status", status);
```

### GET /api/requests/[id]

Single request with all joins. Verify access (landlord owns property OR tenant owns request).

### PATCH /api/requests/[id]

Landlord-only. Updatable fields: `landlord_notes`, `work_order_text`, `vendor_id`, `status`, `actual_cost`. Validate with a partial schema.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] GET /api/requests returns requests filtered by role (landlord sees their properties' requests, tenant sees own)
3. [ ] Query params filter by property, urgency, status
4. [ ] GET /api/requests/[id] returns full detail with property, tenant, vendor, and photos joined
5. [ ] PATCH /api/requests/[id] updates allowed fields (landlord only)
6. [ ] Access control: tenant can't see other tenants' requests; landlord can't see other landlords' requests
7. [ ] Response shape matches what the frontend expects (property_name, tenant_name, vendor_name flattened)
