import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
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

    // Verify the tenant owns this request
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existing } = await supabase
      .from("maintenance_requests")
      .select("id, tenant_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    if (existing.tenant_id !== tenant.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({ status: "resolved" })
      .eq("id", id)
      .select("id, status")
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Failed to resolve request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ request: data });
  } catch (err) {
    console.error("Unexpected error in POST /api/requests/[id]/resolve:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
