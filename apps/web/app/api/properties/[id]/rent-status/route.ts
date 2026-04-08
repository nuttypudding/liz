import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RentStatus } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Fetch property (ownership check via landlord_id)
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id, monthly_rent, rent_due_day")
      .eq("id", id)
      .eq("landlord_id", userId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Fetch most recent rent payment for this property
    const { data: payments } = await supabase
      .from("rent_payments")
      .select("amount, paid_at, period_start, period_end")
      .eq("property_id", id)
      .order("paid_at", { ascending: false })
      .limit(10);

    const allPayments = payments ?? [];
    const latest = allPayments[0] ?? null;

    // Determine the most recent due date that has passed
    const today = new Date();
    const todayDay = today.getDate();
    const dueDay = property.rent_due_day ?? 1;

    let dueDate: Date;
    if (todayDay >= dueDay) {
      dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    } else {
      dueDate = new Date(today.getFullYear(), today.getMonth() - 1, dueDay);
    }

    const dueDateStr = dueDate.toISOString().split("T")[0];

    // Check if any payment covers the current billing period
    const isPaid = allPayments.some(
      (p) => p.period_start <= dueDateStr && p.period_end >= dueDateStr
    );

    const is_overdue = !isPaid;
    const days_overdue = is_overdue
      ? Math.max(
          0,
          Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        )
      : 0;

    const rentStatus: RentStatus = {
      property_id: id,
      monthly_rent: property.monthly_rent ?? 0,
      rent_due_day: dueDay,
      last_paid_at: latest?.paid_at ?? null,
      last_paid_amount: latest ? Number(latest.amount) : null,
      is_overdue,
      days_overdue,
    };

    return NextResponse.json(rentStatus);
  } catch (err) {
    console.error("Unexpected error in GET /api/properties/[id]/rent-status:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
