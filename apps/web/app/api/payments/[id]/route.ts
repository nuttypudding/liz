import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: paymentId } = await params;
    const supabase = createServerSupabaseClient();

    const { data: payment, error: paymentError } = await supabase
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
        stripe_payment_intent_id,
        payment_method,
        metadata,
        payment_periods (
          id,
          month,
          year,
          due_date,
          rent_amount,
          status
        ),
        properties (
          id,
          name,
          address
        )
        `
      )
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Authorization: tenant must own it, or landlord must own the property
    const isTenant = payment.tenant_id === userId;

    const { data: landlordProperty } = await supabase
      .from("properties")
      .select("id")
      .eq("id", payment.property_id)
      .eq("landlord_id", userId)
      .maybeSingle();

    if (!isTenant && !landlordProperty) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch Stripe charge details for receipt (best-effort)
    let stripeDetails: {
      charge_id: string;
      amount: number;
      currency: string;
      payment_method: string | null | undefined;
      last4: string | null | undefined;
      receipt_url: string | null | undefined;
    } | null = null;

    if (payment.stripe_charge_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const charge = await stripe.charges.retrieve(
          payment.stripe_charge_id as string
        );
        stripeDetails = {
          charge_id: charge.id,
          amount: charge.amount / 100,
          currency: charge.currency.toUpperCase(),
          payment_method: charge.payment_method_details?.card?.brand,
          last4: charge.payment_method_details?.card?.last4,
          receipt_url: charge.receipt_url,
        };
      } catch (err) {
        console.warn("Failed to fetch Stripe charge details:", err);
      }
    }

    return NextResponse.json({ ...payment, stripe_details: stripeDetails });
  } catch (err) {
    console.error("Unexpected error in GET /api/payments/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
