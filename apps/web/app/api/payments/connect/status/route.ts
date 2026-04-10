import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("landlord_id", userId)
      .single();

    if (!property) {
      return NextResponse.json({ connected: false, charges_enabled: false });
    }

    const { data: stripeAccount } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id, charges_enabled, payouts_enabled")
      .eq("property_id", property.id)
      .single();

    if (!stripeAccount) {
      return NextResponse.json({ connected: false, charges_enabled: false });
    }

    const account = await stripe.accounts.retrieve(
      stripeAccount.stripe_account_id as string
    );

    return NextResponse.json({
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch account status" },
      { status: 500 }
    );
  }
}
