import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "tenant") {
      return NextResponse.json(
        { error: "Forbidden: only tenants can view this endpoint" },
        { status: 403 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (tenantError) {
      console.error("Error fetching tenant:", tenantError);
      return NextResponse.json(
        { error: "Failed to fetch tenant profile" },
        { status: 500 }
      );
    }

    if (!tenant) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await supabase
      .from("rent_periods")
      .select(
        `*, properties(name, address)`
      )
      .eq("tenant_id", tenant.id)
      .order("period_month", { ascending: false });

    if (error) {
      console.error("Error fetching rent periods:", error);
      return NextResponse.json(
        { error: "Failed to fetch rent periods" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /api/tenant/rent:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
