import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { data: properties } = await supabase
      .from("properties")
      .select("id, name, monthly_rent")
      .eq("landlord_id", userId);

    if (!properties || properties.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const propertyIds = properties.map((p: { id: string }) => p.id);

    // Get resolved requests with costs
    const { data: requests } = await supabase
      .from("maintenance_requests")
      .select("property_id, actual_cost")
      .in("property_id", propertyIds)
      .not("actual_cost", "is", null);

    // Aggregate spend per property
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
