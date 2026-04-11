import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can view rent periods" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get("property_id");
    const status = searchParams.get("status");

    const supabase = createServerSupabaseClient();

    // First, get the landlord's properties
    const { data: properties, error: propsError } = await supabase
      .from("properties")
      .select("id")
      .eq("landlord_id", userId);

    if (propsError) {
      console.error("Error fetching properties:", propsError);
      return NextResponse.json(
        { error: "Failed to fetch properties" },
        { status: 500 }
      );
    }

    const propertyIds = properties?.map((p) => p.id) ?? [];
    if (propertyIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    let query = supabase
      .from("rent_periods")
      .select("*")
      .in("property_id", propertyIds)
      .order("lease_start", { ascending: false });

    if (propertyId) {
      query = query.eq("property_id", propertyId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch rent periods" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /api/rent:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
