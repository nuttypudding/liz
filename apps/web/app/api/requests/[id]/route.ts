import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const patchRequestSchema = z.object({
  landlord_notes: z.string().max(5000).optional(),
  work_order_text: z.string().max(5000).optional(),
  vendor_id: z.string().uuid().optional(),
  status: z
    .enum(["submitted", "triaged", "approved", "dispatched", "resolved", "closed"])
    .optional(),
  actual_cost: z.number().min(0).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const role = await getRole();
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(
        `*, properties(id, name, address_line1, city, state, postal_code, landlord_id), tenants(id, first_name, last_name, email, phone, unit_number, clerk_user_id), vendors(id, name, phone, email, specialty), request_photos(id, storage_path, file_type)`
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    if (role === "tenant") {
      // Tenant can only see their own request
      const tenant = data.tenants as { clerk_user_id?: string } | null;
      if (!tenant || tenant.clerk_user_id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (role === "landlord") {
      const property = data.properties as { landlord_id?: string } | null;
      if (!property || property.landlord_id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ request: data });
  } catch (err) {
    console.error("Unexpected error in GET /api/requests/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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
        { error: "Forbidden: only landlords can update requests" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = patchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify landlord owns the property associated with this request
    const { data: existing } = await supabase
      .from("maintenance_requests")
      .select("property_id, properties!inner(landlord_id)")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    const property = existing.properties as { landlord_id?: string } | null;
    if (!property || property.landlord_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("maintenance_requests")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Failed to update maintenance request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ request: data });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/requests/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
