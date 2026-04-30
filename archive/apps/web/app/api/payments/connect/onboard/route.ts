import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("landlord_id", userId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: "No property found" }, { status: 404 });
    }

    const { data: existingAccount } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id")
      .eq("property_id", property.id)
      .single();

    let stripeAccountId = existingAccount?.stripe_account_id as string | undefined;

    if (!stripeAccountId) {
      const account = await getStripe().accounts.create({
        type: "express",
        country: "US",
      });
      stripeAccountId = account.id;

      await supabase.from("stripe_accounts").insert({
        property_id: property.id,
        stripe_account_id: stripeAccountId,
      });
    }

    const accountLink = await getStripe().accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?connected=true`,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?refresh=true`,
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Stripe Connect onboard error:", error);
    return NextResponse.json(
      { error: "Failed to create account link" },
      { status: 500 }
    );
  }
}
