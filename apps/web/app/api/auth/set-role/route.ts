import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { setRoleSchema } from "@/lib/validations";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = setRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { role } = parsed.data;
  const client = await clerkClient();

  // Prevent re-assignment if role already set
  const user = await client.users.getUser(userId);
  const existingRole = (user.publicMetadata as { role?: string })?.role;
  if (existingRole) {
    return NextResponse.json({ error: "Role already assigned" }, { status: 409 });
  }

  // Set role in Clerk publicMetadata
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });

  // Create initial database records
  const supabase = createServerSupabaseClient();
  if (role === "landlord") {
    await supabase.from("landlord_profiles").upsert(
      { user_id: userId },
      { onConflict: "user_id" }
    );
  } else if (role === "tenant") {
    const email = user.emailAddresses?.[0]?.emailAddress;
    if (email) {
      await supabase
        .from("tenants")
        .update({ clerk_user_id: userId })
        .eq("email", email)
        .is("clerk_user_id", null);
    }
  }

  const redirect = role === "landlord" ? "/onboarding" : "/submit";
  return NextResponse.json({ success: true, redirect });
}
