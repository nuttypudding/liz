import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dispatchSchema } from "@/lib/validations";

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
        { error: "Forbidden: only landlords can dispatch vendors" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = dispatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { vendor_id, work_order_text } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Verify landlord owns the property associated with this request
    const { data: existing } = await supabase
      .from("maintenance_requests")
      .select("property_id, status")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", existing.property_id)
      .eq("landlord_id", userId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the vendor belongs to this landlord
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("id", vendor_id)
      .eq("landlord_id", userId)
      .single();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({
        status: "dispatched",
        vendor_id,
        work_order_text,
        dispatched_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Failed to dispatch vendor" },
        { status: 500 }
      );
    }

    return NextResponse.json({ request: data });
  } catch (err) {
    console.error("Unexpected error in POST /api/requests/[id]/dispatch:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
