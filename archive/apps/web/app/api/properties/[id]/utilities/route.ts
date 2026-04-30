import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { utilityUpsertSchema } from "@/lib/validations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: propertyId } = await params;
    const supabase = createServerSupabaseClient();

    // Check access: landlord who owns property OR tenant on this property
    const [propertyRes, tenantRes] = await Promise.all([
      supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("landlord_id", userId)
        .maybeSingle(),
      supabase
        .from("tenants")
        .select("id")
        .eq("property_id", propertyId)
        .eq("clerk_user_id", userId)
        .maybeSingle(),
    ]);

    if (!propertyRes.data && !tenantRes.data) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const isLandlord = !!propertyRes.data;

    let query = supabase
      .from("property_utilities")
      .select("*")
      .eq("property_id", propertyId)
      .order("utility_type");

    // Tenants only see non-N/A rows
    if (!isLandlord) {
      query = query.neq("confirmation_status", "not_applicable");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch utilities:", error);
      return NextResponse.json({ error: "Failed to fetch utilities" }, { status: 500 });
    }

    // Omit account_number for tenants
    const utilities = isLandlord
      ? (data ?? [])
      : (data ?? []).map(({ account_number: _omit, ...rest }) => rest);

    return NextResponse.json({ utilities });
  } catch (err) {
    console.error("Unexpected error in GET /api/properties/[id]/utilities:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: propertyId } = await params;
    const supabase = createServerSupabaseClient();

    // Landlord only — verify ownership
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("landlord_id", userId)
      .maybeSingle();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const parsed = utilityUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const rows = parsed.data.utilities.map((u) => ({
      ...u,
      property_id: propertyId,
    }));

    const { data, error } = await supabase
      .from("property_utilities")
      .upsert(rows, { onConflict: "property_id,utility_type" })
      .select();

    if (error) {
      console.error("Failed to upsert utilities:", error);
      return NextResponse.json({ error: "Failed to save utilities" }, { status: 500 });
    }

    return NextResponse.json({ utilities: data });
  } catch (err) {
    console.error("Unexpected error in PUT /api/properties/[id]/utilities:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
