import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can view rent summary" },
        { status: 403 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: properties, error: propsError } = await supabase
      .from("properties")
      .select("id")
      .eq("landlord_id", userId);

    if (propsError) {
      console.error("Error fetching properties:", propsError);
      return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
    }

    const propertyIds = properties?.map((p) => p.id) ?? [];

    if (propertyIds.length === 0) {
      return NextResponse.json({
        data: {
          overdue_count: 0,
          due_count: 0,
          paid_count: 0,
          upcoming_count: 0,
          total_owed: 0,
          total_collected: 0,
        },
      });
    }

    const { data: periods, error } = await supabase
      .from("rent_periods")
      .select("status, monthly_rent, amount_paid")
      .in("property_id", propertyIds);

    if (error) {
      console.error("Error fetching rent periods:", error);
      return NextResponse.json({ error: "Failed to fetch rent summary" }, { status: 500 });
    }

    const allPeriods = periods ?? [];

    const overdue_count = allPeriods.filter((p) => p.status === "overdue").length;
    const due_count = allPeriods.filter((p) => p.status === "due").length;
    const paid_count = allPeriods.filter((p) => p.status === "paid").length;
    const upcoming_count = allPeriods.filter((p) => p.status === "upcoming").length;
    const total_owed = allPeriods.reduce((sum, p) => sum + Number(p.monthly_rent ?? 0), 0);
    const total_collected = allPeriods
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => sum + Number(p.amount_paid ?? 0), 0);

    return NextResponse.json({
      data: {
        overdue_count,
        due_count,
        paid_count,
        upcoming_count,
        total_owed,
        total_collected,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
