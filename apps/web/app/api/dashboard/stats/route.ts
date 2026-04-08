import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    let propertyIds: string[];

    if (propertyId) {
      // Verify landlord owns this property
      const { data: prop } = await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("landlord_id", userId)
        .single();
      propertyIds = prop ? [prop.id] : [];
    } else {
      // Get all landlord's properties
      const { data: properties } = await supabase
        .from("properties")
        .select("id")
        .eq("landlord_id", userId);
      propertyIds = (properties ?? []).map((p: { id: string }) => p.id);
    }

    if (propertyIds.length === 0) {
      return NextResponse.json({
        emergency_count: 0,
        open_count: 0,
        avg_resolution_days: 0,
        monthly_spend: 0,
      });
    }

    // Get all requests for these properties
    const { data: requests } = await supabase
      .from("maintenance_requests")
      .select("ai_urgency, status, actual_cost, created_at, resolved_at")
      .in("property_id", propertyIds);

    const allRequests = requests ?? [];
    const emergency_count = allRequests.filter(
      (r) => r.ai_urgency === "emergency" && r.status !== "resolved" && r.status !== "closed"
    ).length;
    const open_count = allRequests.filter(
      (r) => r.status !== "resolved" && r.status !== "closed"
    ).length;

    // Average resolution time for resolved requests
    const resolved = allRequests.filter((r) => r.resolved_at && r.created_at);
    const avg_resolution_days =
      resolved.length > 0
        ? resolved.reduce((sum, r) => {
            const diff = new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime();
            return sum + diff / (1000 * 60 * 60 * 24);
          }, 0) / resolved.length
        : 0;

    // Monthly spend (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthly_spend = allRequests
      .filter((r) => r.actual_cost && r.created_at >= monthStart)
      .reduce((sum, r) => sum + Number(r.actual_cost), 0);

    return NextResponse.json({
      emergency_count,
      open_count,
      avg_resolution_days: Math.round(avg_resolution_days * 10) / 10,
      monthly_spend,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
