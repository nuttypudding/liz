import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface PropertyFinancials {
  property_id: string;
  property_name: string;
  rent_expected: number;
  rent_collected: number;
  collection_rate: number;
  maintenance_costs: number;
  net_income: number;
}

export interface FinancialSummary {
  month: number;
  year: number;
  rent_expected: number;
  rent_collected: number;
  collection_rate: number;
  maintenance_costs: number;
  vendor_payments_total: number;
  net_income: number;
  properties: PropertyFinancials[];
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = req.nextUrl;
    const now = new Date();
    const month = parseInt(url.searchParams.get("month") ?? String(now.getMonth() + 1));
    const year = parseInt(url.searchParams.get("year") ?? String(now.getFullYear()));

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month (1-12)" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id, name")
      .eq("landlord_id", userId);

    if (propertiesError) {
      console.error("Properties fetch error:", propertiesError);
      return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({ error: "No properties found" }, { status: 404 });
    }

    // Build month range — handle month 12 overflow to next year
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const summary: FinancialSummary = {
      month,
      year,
      rent_expected: 0,
      rent_collected: 0,
      collection_rate: 0,
      maintenance_costs: 0,
      vendor_payments_total: 0,
      net_income: 0,
      properties: [],
    };

    for (const property of properties) {
      const { data: expectedRent } = await supabase
        .from("payment_periods")
        .select("rent_amount")
        .eq("property_id", property.id)
        .eq("month", month)
        .eq("year", year);

      const rentExpected = expectedRent?.reduce((sum, p) => sum + (p.rent_amount ?? 0), 0) ?? 0;

      const { data: collectedRent } = await supabase
        .from("payments")
        .select("amount")
        .eq("property_id", property.id)
        .eq("status", "completed")
        .gte("paid_at", startDate)
        .lt("paid_at", endDate);

      const rentCollected = collectedRent?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;

      const { data: vendorPayments } = await supabase
        .from("vendor_payments")
        .select("amount")
        .eq("property_id", property.id)
        .gte("payment_date", startDate)
        .lt("payment_date", endDate);

      const maintenanceCosts = vendorPayments?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;

      const collectionRate = rentExpected > 0 ? (rentCollected / rentExpected) * 100 : 0;
      const netIncome = rentCollected - maintenanceCosts;

      summary.properties.push({
        property_id: property.id as string,
        property_name: property.name as string,
        rent_expected: rentExpected,
        rent_collected: rentCollected,
        collection_rate: Math.round(collectionRate),
        maintenance_costs: maintenanceCosts,
        net_income: netIncome,
      });

      summary.rent_expected += rentExpected;
      summary.rent_collected += rentCollected;
      summary.maintenance_costs += maintenanceCosts;
      summary.vendor_payments_total += maintenanceCosts;
    }

    summary.collection_rate =
      summary.rent_expected > 0
        ? Math.round((summary.rent_collected / summary.rent_expected) * 100)
        : 0;
    summary.net_income = summary.rent_collected - summary.maintenance_costs;

    return NextResponse.json(summary);
  } catch (err) {
    console.error("Financial summary error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
