import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: "No role assigned" }, { status: 403 });
  }

  try {
    const url = req.nextUrl;
    const tenantId = url.searchParams.get("tenant_id");
    const propertyId = url.searchParams.get("property_id");
    const status = url.searchParams.get("status");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    const supabase = createServerSupabaseClient();

    let query = supabase
      .from("payments")
      .select(
        `
        id,
        amount,
        status,
        paid_at,
        created_at,
        tenant_id,
        property_id,
        payment_period_id,
        stripe_charge_id,
        payment_method,
        payment_periods (
          month,
          year,
          due_date
        ),
        properties (
          name
        )
        `,
        { count: "exact" }
      );

    if (role === "landlord") {
      // Landlords see payments for their own properties only
      const { data: landlordProperties } = await supabase
        .from("properties")
        .select("id")
        .eq("landlord_id", userId);

      if (!landlordProperties || landlordProperties.length === 0) {
        return NextResponse.json(
          { payments: [], total: 0, limit, offset },
          { status: 200 }
        );
      }

      const propertyIds = landlordProperties.map((p) => p.id as string);
      query = query.in("property_id", propertyIds);

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }
    } else {
      // Tenants see only their own payments
      query = query.eq("tenant_id", userId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: payments, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Payments fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ payments: payments ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    console.error("Unexpected error in GET /api/payments:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
