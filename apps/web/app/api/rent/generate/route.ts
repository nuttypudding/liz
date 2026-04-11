import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can generate rent periods" },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("month" in body)) {
      return NextResponse.json(
        { error: "Invalid request body: month is required" },
        { status: 400 }
      );
    }

    const { month } = body as { month: string };
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month format: expected YYYY-MM" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get all properties owned by landlord
    const { data: properties, error: propsError } = await supabase
      .from("properties")
      .select("id, monthly_rent, rent_due_day")
      .eq("landlord_id", userId);

    if (propsError) {
      console.error("Error fetching properties:", propsError);
      return NextResponse.json(
        { error: "Failed to fetch properties" },
        { status: 500 }
      );
    }

    // Get all tenants for these properties
    const propertyIds = properties?.map((p) => p.id) ?? [];
    if (propertyIds.length === 0) {
      return NextResponse.json({
        created: 0,
        existing: 0,
      });
    }

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, property_id")
      .in("property_id", propertyIds);

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError);
      return NextResponse.json(
        { error: "Failed to fetch tenants" },
        { status: 500 }
      );
    }

    // Create rent periods for each property-tenant combination
    const [year, monthNum] = month.split("-");

    const rentPeriodsToCreate = (tenants ?? [])
      .map((tenant) => {
        const property = properties?.find((p) => p.id === tenant.property_id);
        if (!property) return null;

        return {
          property_id: tenant.property_id,
          tenant_id: tenant.id,
          lease_start: `${year}-${monthNum}-01`,
          lease_end: null,
          monthly_rent: property.monthly_rent ?? 0,
          rent_due_day: property.rent_due_day ?? 1,
          status: "upcoming",
        };
      })
      .filter(Boolean);

    if (rentPeriodsToCreate.length === 0) {
      return NextResponse.json({
        created: 0,
        existing: 0,
      });
    }

    // Insert, handling duplicates (unique constraint)
    const { data: created, error: insertError } = await supabase
      .from("rent_periods")
      .insert(rentPeriodsToCreate as any)
      .select();

    if (insertError && !insertError.message.includes("duplicate")) {
      console.error("Error creating rent periods:", insertError);
      return NextResponse.json(
        { error: "Failed to create rent periods" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      created: created?.length ?? 0,
      existing: rentPeriodsToCreate.length - (created?.length ?? 0),
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/rent/generate:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
