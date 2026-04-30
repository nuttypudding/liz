---
id: 009
title: Implement AI work order draft generation
tier: Sonnet
depends_on: [1, 8]
feature: ai-maintenance-intake-mvp
---

# 009 — Implement AI Work Order Draft Generation

## Objective

When a landlord views a triaged request and selects a vendor, AI generates a draft work order that includes the issue description, property address, tenant contact info, and relevant details from the AI classification.

## Context

- Feature plan: "The Core Four" section 3 (The Matchmaker)
- The `WorkOrderDraft` component at `apps/web/components/requests/work-order-draft.tsx` shows an editable textarea
- Currently the work order text is empty or hardcoded. Need an API endpoint to generate it.
- Claude client from task 008: `apps/web/lib/anthropic.ts`

## Implementation

### Option A: New API endpoint

Create `apps/web/app/api/requests/[id]/work-order/route.ts`:

```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  await requireRole("landlord");
  const { id } = await params;

  const supabase = createServerSupabaseClient();

  // Fetch request with joins
  const { data: req } = await supabase
    .from("maintenance_requests")
    .select(`
      *,
      properties(name, address),
      tenants(name, phone, email, unit_number),
      vendors(name, phone, email, specialty)
    `)
    .eq("id", id)
    .single();

  // Verify ownership via property
  // ...

  const body = await request.json();
  const vendorId = body.vendor_id;

  // Fetch vendor details
  const { data: vendor } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .single();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Draft a professional work order for a maintenance vendor. Keep it concise and actionable.

Issue: ${req.tenant_message}
Category: ${req.ai_category}
Urgency: ${req.ai_urgency}
AI Assessment: ${req.ai_recommended_action}
Estimated Cost: $${req.ai_cost_estimate_low} - $${req.ai_cost_estimate_high}

Property: ${req.properties.name}, ${req.properties.address}
Unit: ${req.tenants?.unit_number || "N/A"}
Tenant Contact: ${req.tenants?.name}, ${req.tenants?.phone || req.tenants?.email || "N/A"}

Vendor: ${vendor.name} (${vendor.specialty})

Write the work order as plain text. Include: issue summary, location, tenant contact for access, scope of work, and any safety notes if applicable.`
    }],
  });

  const workOrderText = response.content[0].type === "text"
    ? response.content[0].text
    : "";

  return NextResponse.json({ work_order_text: workOrderText });
}
```

### Option B: Generate during dispatch

Could also be generated inline when landlord clicks "Approve & Send" — but a separate endpoint allows the landlord to preview and edit before dispatching.

Recommend Option A for better UX.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] API endpoint generates a professional work order draft via Claude
3. [ ] Work order includes: issue summary, property address, unit, tenant contact, scope of work
4. [ ] Landlord can view and edit the draft before dispatching
5. [ ] Only accessible by the landlord who owns the property
6. [ ] Graceful fallback if Claude API fails (return a simple template-based work order)
