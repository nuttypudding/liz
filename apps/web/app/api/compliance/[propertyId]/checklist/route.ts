import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId } = await params;
    const supabase = createServerSupabaseClient();

    // Verify ownership
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("landlord_id", userId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Parse optional filter
    const { searchParams } = new URL(request.url);
    const completedFilter = searchParams.get("completed");

    let query = supabase
      .from("compliance_checklist_items")
      .select("id, topic, description, completed, completed_at, created_at, updated_at")
      .eq("property_id", propertyId)
      .order("topic");

    if (completedFilter === "true") {
      query = query.eq("completed", true);
    } else if (completedFilter === "false") {
      query = query.eq("completed", false);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) {
      console.error("Error fetching checklist items:", itemsError);
      return NextResponse.json({ error: "Failed to fetch checklist items" }, { status: 500 });
    }

    return NextResponse.json({
      property_id: propertyId,
      items: items ?? [],
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/compliance/[propertyId]/checklist:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
