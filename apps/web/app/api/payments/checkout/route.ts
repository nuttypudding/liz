import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { payment_period_id } = body as { payment_period_id: string };

    if (!payment_period_id) {
      return NextResponse.json(
        { error: "payment_period_id is required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get payment period details
    const { data: paymentPeriod, error: periodError } = await supabase
      .from("payment_periods")
      .select("id, property_id, tenant_id, rent_amount, month, year")
      .eq("id", payment_period_id)
      .single();

    if (periodError || !paymentPeriod) {
      return NextResponse.json(
        { error: "Payment period not found" },
        { status: 404 }
      );
    }

    // Get property info
    const { data: property } = await supabase
      .from("properties")
      .select("id, landlord_id, name")
      .eq("id", paymentPeriod.property_id)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Get landlord's connected Stripe account
    const { data: stripeAccount } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("property_id", property.id)
      .single();

    if (!stripeAccount || !stripeAccount.charges_enabled) {
      return NextResponse.json(
        { error: "Landlord Stripe account not ready" },
        { status: 400 }
      );
    }

    // Get tenant email (best effort — used for Stripe pre-fill)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("email, first_name, last_name")
      .eq("id", paymentPeriod.tenant_id)
      .maybeSingle();

    // Create Checkout Session
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Rent - ${property.name} (${paymentPeriod.month}/${paymentPeriod.year})`,
              description: tenant
                ? `Payment for ${tenant.first_name} ${tenant.last_name}`.trim()
                : undefined,
            },
            unit_amount: Math.round((paymentPeriod.rent_amount as number) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay?canceled=true`,
      customer_email: tenant?.email ?? undefined,
      client_reference_id: paymentPeriod.tenant_id as string,
      metadata: {
        payment_period_id: paymentPeriod.id as string,
        property_id: property.id as string,
        tenant_id: paymentPeriod.tenant_id as string,
        month: String(paymentPeriod.month),
        year: String(paymentPeriod.year),
      },
      payment_intent_data: {
        on_behalf_of: stripeAccount.stripe_account_id as string,
      },
    });

    // Create initial payment record (status: pending)
    await supabase.from("payments").insert({
      payment_period_id: paymentPeriod.id,
      tenant_id: paymentPeriod.tenant_id,
      property_id: paymentPeriod.property_id,
      amount: paymentPeriod.rent_amount,
      status: "pending",
      metadata: { checkout_session_id: session.id },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
