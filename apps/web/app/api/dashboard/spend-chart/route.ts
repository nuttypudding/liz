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

    if (propertyId) {
      // Single-property mode: return monthly time series (last 6 months)
      const { data: prop } = await supabase
        .from("properties")
        .select("id, monthly_rent")
        .eq("id", propertyId)
        .eq("landlord_id", userId)
        .single();

      if (!prop) {
        return NextResponse.json({ data: [] });
      }

      const monthlyRent = Number(prop.monthly_rent ?? 0);
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const { data: requests } = await supabase
        .from("maintenance_requests")
        .select("actual_cost, created_at")
        .eq("property_id", propertyId)
        .not("actual_cost", "is", null)
        .gte("created_at", sixMonthsAgo.toISOString());

      // Build spend by month map
      const spendByMonth: Record<string, number> = {};
      for (const r of requests ?? []) {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        spendByMonth[key] = (spendByMonth[key] ?? 0) + Number(r.actual_cost);
      }

      // Generate last 6 months in order
      const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const data = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        data.push({
          property_name: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
          spend: spendByMonth[key] ?? 0,
          rent: monthlyRent,
        });
      }

      return NextResponse.json({ data });
    }

    // All-properties mode: per-property comparison (existing behavior)
    const { data: properties } = await supabase
      .from("properties")
      .select("id, name, monthly_rent")
      .eq("landlord_id", userId);

    if (!properties || properties.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const propertyIds = properties.map((p: { id: string }) => p.id);

    const { data: requests } = await supabase
      .from("maintenance_requests")
      .select("property_id, actual_cost")
      .in("property_id", propertyIds)
      .not("actual_cost", "is", null);

    const spendByProperty: Record<string, number> = {};
    for (const r of requests ?? []) {
      spendByProperty[r.property_id] = (spendByProperty[r.property_id] ?? 0) + Number(r.actual_cost);
    }

    const data = properties.map((p: { id: string; name: string; monthly_rent: number | null }) => ({
      property_name: p.name,
      spend: spendByProperty[p.id] ?? 0,
      rent: Number(p.monthly_rent ?? 0),
    }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
