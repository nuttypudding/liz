import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { anthropic } from "@/lib/anthropic";
import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fullName, formatAddress } from "@/lib/format";

const workOrderRequestSchema = z.object({
  vendor_id: z.string().uuid(),
});

type RequestWithJoins = {
  id: string;
  tenant_message: string;
  ai_category: string | null;
  ai_urgency: string | null;
  ai_recommended_action: string | null;
  ai_cost_estimate_low: number | null;
  ai_cost_estimate_high: number | null;
  properties: {
    name: string;
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
    landlord_id: string;
  } | null;
  tenants: {
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    unit_number: string | null;
  } | null;
};

type Vendor = {
  name: string;
  specialty: string;
};

function fallbackWorkOrder(req: RequestWithJoins, vendor: Vendor): string {
  const property = req.properties;
  const tenant = req.tenants;
  const propertyLine = property
    ? `${property.name}, ${formatAddress(property)}`
    : "N/A";
  const tenantName = tenant ? fullName(tenant) || "N/A" : "N/A";
  return [
    `WORK ORDER`,
    ``,
    `Issue: ${req.tenant_message}`,
    `Category: ${req.ai_category ?? "general"}`,
    `Urgency: ${req.ai_urgency ?? "medium"}`,
    ``,
    `Property: ${propertyLine}`,
    `Unit: ${tenant?.unit_number ?? "N/A"}`,
    `Tenant Contact: ${tenantName}, ${tenant?.phone ?? tenant?.email ?? "N/A"}`,
    ``,
    `Assigned Vendor: ${vendor.name} (${vendor.specialty})`,
    ``,
    `Scope of Work: ${req.ai_recommended_action ?? "Inspect and repair as needed."}`,
  ].join("\n");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can generate work orders" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = workOrderRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: req, error: fetchError } = await supabase
      .from("maintenance_requests")
      .select(
        `id, tenant_message, ai_category, ai_urgency, ai_recommended_action, ai_cost_estimate_low, ai_cost_estimate_high, properties(name, address_line1, city, state, postal_code, landlord_id), tenants(first_name, last_name, phone, email, unit_number)`
      )
      .eq("id", id)
      .single();

    if (fetchError || !req) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const property = req.properties as unknown as RequestWithJoins["properties"];
    if (!property || property.landlord_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, name, specialty")
      .eq("id", parsed.data.vendor_id)
      .eq("landlord_id", userId)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const maintenanceReq = req as unknown as RequestWithJoins;
    let workOrderText: string;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Draft a professional work order for a maintenance vendor. Be concise and actionable.

Issue: ${maintenanceReq.tenant_message}
Category: ${maintenanceReq.ai_category ?? "general"}
Urgency: ${maintenanceReq.ai_urgency ?? "medium"}
AI Assessment: ${maintenanceReq.ai_recommended_action ?? "Inspect and repair as needed."}
${maintenanceReq.ai_cost_estimate_low != null ? `Estimated Cost: $${maintenanceReq.ai_cost_estimate_low} - $${maintenanceReq.ai_cost_estimate_high}` : ""}

Property: ${property.name}, ${formatAddress(property)}
Unit: ${maintenanceReq.tenants?.unit_number ?? "N/A"}
Tenant Contact: ${maintenanceReq.tenants ? fullName(maintenanceReq.tenants) || "N/A" : "N/A"}, ${maintenanceReq.tenants?.phone ?? maintenanceReq.tenants?.email ?? "N/A"}

Vendor: ${vendor.name} (${vendor.specialty})

Write the work order as plain text. Include: issue summary, location, tenant contact for access, scope of work, and any safety notes if applicable.`,
          },
        ],
      });

      workOrderText =
        response.content[0].type === "text"
          ? response.content[0].text
          : fallbackWorkOrder(maintenanceReq, vendor);
    } catch (err) {
      console.error("Claude API failed, using fallback work order:", err);
      workOrderText = fallbackWorkOrder(maintenanceReq, vendor);
    }

    return NextResponse.json({ work_order_text: workOrderText });
  } catch (err) {
    console.error("Unexpected error in POST /api/requests/[id]/work-order:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
