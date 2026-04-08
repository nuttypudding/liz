import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rentPaymentSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Verify property ownership
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("landlord_id", userId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const result = rentPaymentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid data", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { amount, paid_at, period_start, period_end, tenant_id, notes } = result.data;

    const { data: payment, error: insertError } = await supabase
      .from("rent_payments")
      .insert({
        property_id: id,
        amount,
        paid_at,
        period_start,
        period_end,
        tenant_id: tenant_id ?? null,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting rent payment:", insertError);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/properties/[id]/rent-payments:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
