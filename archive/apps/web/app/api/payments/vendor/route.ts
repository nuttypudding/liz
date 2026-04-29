import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface CreateVendorPaymentRequest {
  property_id: string;
  vendor_name: string;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  description?: string;
  request_id?: string; // Link to maintenance request
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getRole();
  if (role !== "landlord") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: CreateVendorPaymentRequest = await req.json();
    const { property_id, vendor_name, amount, payment_date, description, request_id } = body;

    if (!property_id || !vendor_name || !amount || !payment_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify landlord owns this property
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", property_id)
      .eq("landlord_id", userId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Property not found or unauthorized" },
        { status: 403 }
      );
    }

    // Optional: verify request_id belongs to same property
    if (request_id) {
      const { data: request } = await supabase
        .from("maintenance_requests")
        .select("id")
        .eq("id", request_id)
        .eq("property_id", property_id)
        .single();

      if (!request) {
        return NextResponse.json(
          { error: "Maintenance request not found for this property" },
          { status: 404 }
        );
      }
    }

    const { data: vendorPayment, error: insertError } = await supabase
      .from("vendor_payments")
      .insert({
        property_id,
        vendor_name,
        amount,
        payment_date,
        description: description ?? null,
        request_id: request_id ?? null,
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create vendor payment:", insertError);
      return NextResponse.json(
        { error: "Failed to create vendor payment" },
        { status: 500 }
      );
    }

    return NextResponse.json(vendorPayment, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/payments/vendor:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getRole();
  if (role !== "landlord") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = req.nextUrl;
    const propertyId = url.searchParams.get("property_id");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    const supabase = createServerSupabaseClient();

    // Build base query
    let query = supabase
      .from("vendor_payments")
      .select(
        `
        id,
        property_id,
        vendor_name,
        amount,
        payment_date,
        description,
        request_id,
        created_at,
        created_by,
        maintenance_requests (
          id,
          title,
          status
        )
        `,
        { count: "exact" }
      );

    if (propertyId) {
      // Verify landlord owns this property
      const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("landlord_id", userId)
        .single();

      if (!property) {
        return NextResponse.json(
          { error: "Property not found or unauthorized" },
          { status: 403 }
        );
      }

      query = query.eq("property_id", propertyId);
    } else {
      // Get all vendor payments for landlord's properties
      const { data: landlordProperties } = await supabase
        .from("properties")
        .select("id")
        .eq("landlord_id", userId);

      const propertyIds = landlordProperties?.map((p) => p.id as string) ?? [];
      if (propertyIds.length === 0) {
        return NextResponse.json({ payments: [], total: 0, limit, offset });
      }

      query = query.in("property_id", propertyIds);
    }

    const { data: payments, error, count } = await query
      .order("payment_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Vendor payments fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch vendor payments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ payments: payments ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    console.error("Unexpected error in GET /api/payments/vendor:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
