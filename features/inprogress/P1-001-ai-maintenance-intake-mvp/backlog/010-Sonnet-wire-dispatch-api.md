---
id: 010
title: Wire dispatch API route to Supabase
tier: Sonnet
depends_on: [1, 5]
feature: ai-maintenance-intake-mvp
---

# 010 — Wire Dispatch API Route to Supabase

## Objective

Make the "Approve & Send" flow real: update the maintenance request with vendor assignment and work order, change status to "dispatched".

## Context

- Existing stub: `apps/web/app/api/requests/[id]/dispatch/route.ts` — POST
- Zod schema: `dispatchSchema` = `{ vendor_id: string (uuid), work_order_text: string }`
- The `ApproveButton` component at `apps/web/components/requests/approve-button.tsx` triggers this
- After dispatch: request status → "dispatched", vendor_id set, work_order_text saved

## Implementation

### POST /api/requests/[id]/dispatch

```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  await requireRole("landlord");
  const { id } = await params;

  const body = await request.json();
  const parsed = dispatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.issues }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Verify ownership: request belongs to landlord's property
  const { data: req } = await supabase
    .from("maintenance_requests")
    .select("id, property_id, properties!inner(landlord_id)")
    .eq("id", id)
    .single();

  if (!req || req.properties.landlord_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify vendor belongs to this landlord
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("id", parsed.data.vendor_id)
    .eq("landlord_id", userId)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Update request
  const { data: updated, error } = await supabase
    .from("maintenance_requests")
    .update({
      vendor_id: parsed.data.vendor_id,
      work_order_text: parsed.data.work_order_text,
      status: "dispatched",
    })
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json({ request: updated });
}
```

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] POST /api/requests/[id]/dispatch updates status to "dispatched"
3. [ ] vendor_id and work_order_text are saved on the request
4. [ ] Ownership verified: request's property belongs to the landlord
5. [ ] Vendor verified: vendor belongs to the landlord
6. [ ] Zod validation on request body
7. [ ] Returns the updated request object
