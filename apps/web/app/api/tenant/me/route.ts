import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("id, property_id, name, email, phone, unit_number")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch tenant profile" },
        { status: 500 }
      );
    }

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tenant });
  } catch (err) {
    console.error("Unexpected error in GET /api/tenant/me:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
