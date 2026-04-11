import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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

    // Verify property ownership
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("landlord_id", userId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const actionType = searchParams.get("action_type");
    const rawLimit = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
    const limit = isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : Math.min(rawLimit, MAX_LIMIT);
    const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
    const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Build query
    let query = supabase
      .from("compliance_audit_log")
      .select("id, action_type, details, created_at, landlord_id", { count: "exact" })
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionType) {
      query = query.eq("action_type", actionType);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      // Treat end_date as inclusive through end of day
      const endOfDay = endDate.endsWith("Z") ? endDate : `${endDate}T23:59:59Z`;
      query = query.lte("created_at", endOfDay);
    }

    const { data: entries, error: queryError, count } = await query;

    if (queryError) {
      console.error("Failed to fetch audit log:", queryError);
      return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
    }

    return NextResponse.json({
      property_id: propertyId,
      total_count: count ?? 0,
      limit,
      offset,
      entries: (entries ?? []).map((entry) => ({
        id: entry.id,
        action_type: entry.action_type,
        details: entry.details,
        timestamp: entry.created_at,
        actor_id: entry.landlord_id,
      })),
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/compliance/[propertyId]/audit-log:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
