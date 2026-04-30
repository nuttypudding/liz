import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can update rent periods" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify the rent period belongs to this landlord
    const { data: rentPeriod, error: fetchError } = await supabase
      .from("rent_periods")
      .select("*, properties(landlord_id)")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching rent period:", fetchError);
      return NextResponse.json(
        { error: "Rent period not found" },
        { status: 404 }
      );
    }

    if (!rentPeriod || (rentPeriod.properties as any)?.landlord_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: you cannot update this rent period" },
        { status: 403 }
      );
    }

    const {
      status,
      amount_paid,
      paid_date,
      payment_notes,
    } = body as {
      status?: string;
      amount_paid?: number;
      paid_date?: string;
      payment_notes?: string;
    };

    // Calculate status based on amount_paid if provided
    let newStatus = status;
    if (amount_paid !== undefined) {
      if (amount_paid >= rentPeriod.monthly_rent) {
        newStatus = "paid";
      } else if (amount_paid > 0) {
        newStatus = "partial";
      }
    }

    // Update the rent period
    const { data: updated, error: updateError } = await supabase
      .from("rent_periods")
      .update({
        ...(newStatus && { status: newStatus }),
        ...(amount_paid !== undefined && { amount_paid }),
        ...(paid_date && { paid_at: paid_date }),
        ...(payment_notes && { payment_notes }),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating rent period:", updateError);
      return NextResponse.json(
        { error: "Failed to update rent period" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/rent/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
