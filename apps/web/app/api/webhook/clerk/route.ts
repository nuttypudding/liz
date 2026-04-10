import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent, clerkClient } from "@clerk/nextjs/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await request.text();

  let evt: WebhookEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    const { id, email_addresses, public_metadata } = evt.data;
    const role = (public_metadata as Record<string, unknown>)?.role;
    const primaryEmail = email_addresses?.[0]?.email_address;

    if (role === "tenant" && primaryEmail) {
      const supabase = createServerSupabaseClient();

      // Try to match existing tenant by email (added by landlord before signup)
      const { data: existing } = await supabase
        .from("tenants")
        .select("id")
        .eq("email", primaryEmail)
        .is("clerk_user_id", null)
        .single();

      if (existing) {
        await supabase
          .from("tenants")
          .update({ clerk_user_id: id })
          .eq("id", existing.id);
      }
      // If no match, tenant will be linked when landlord adds them
    } else if (!role) {
      // Self-signup via /sign-up UI — default role to landlord.
      // MVP assumption: tenants never self-signup; they are created by landlords.
      const client = await clerkClient();
      await client.users.updateUserMetadata(id, {
        publicMetadata: { role: "landlord" },
      });
    }
  }

  return new Response("OK", { status: 200 });
}
