import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/payments/generate
 * Generates the current month's payment period for the authenticated tenant (if missing).
 * Returns the current period + property info for the balance card.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getRole();
  if (role !== "tenant") {
    return NextResponse.json({ error: "Tenant role required" }, { status: 403 });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Find tenant record to get property_id
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, property_id")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant record not found" }, { status: 404 });
    }

    const propertyId = tenant.property_id as string;
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Check if current month's period already exists
    const { data: existingPeriod } = await supabase
      .from("payment_periods")
      .select("id, property_id, tenant_id, month, year, rent_amount, due_date, status")
      .eq("property_id", propertyId)
      .eq("tenant_id", userId)
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .maybeSingle();

    let period = existingPeriod;

    if (!period) {
      // Get property info for rent amount and due day
      const { data: property } = await supabase
        .from("properties")
        .select("monthly_rent, rent_due_day")
        .eq("id", propertyId)
        .single();

      const rentAmount = (property?.monthly_rent as number | null) ?? 0;
      const dueDay = (property?.rent_due_day as number | null) ?? 1;
      const dueDate = new Date(currentYear, currentMonth - 1, dueDay);

      const { data: newPeriod } = await supabase
        .from("payment_periods")
        .insert({
          property_id: propertyId,
          tenant_id: userId,
          year: currentYear,
          month: currentMonth,
          rent_amount: rentAmount,
          due_date: dueDate.toISOString().split("T")[0],
          status: "pending",
        })
        .select("id, property_id, tenant_id, month, year, rent_amount, due_date, status")
        .single();

      period = newPeriod;
    }

    // Get property name
    const { data: property } = await supabase
      .from("properties")
      .select("id, name")
      .eq("id", propertyId)
      .single();

    return NextResponse.json({
      period,
      property: property ?? { id: propertyId, name: "Your Property" },
    });
  } catch (error) {
    console.error("Generate payment period error:", error);
    return NextResponse.json(
      { error: "Failed to generate payment period" },
      { status: 500 }
    );
  }
}
