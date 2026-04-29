import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSchedulingTaskSchema } from "@/lib/validations";

// GET /api/scheduling/tasks?requestId=<uuid>
// Fetch the scheduling task for a given maintenance request.
// Landlords: verified via property ownership.
// Tenants: verified via tenant record linked to clerk_user_id.
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord" && role !== "tenant") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestId = request.nextUrl.searchParams.get("requestId");
    if (!requestId) {
      return NextResponse.json({ error: "requestId query parameter is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: req } = await supabase
      .from("maintenance_requests")
      .select("property_id, tenant_id")
      .eq("id", requestId)
      .single();

    if (!req) {
      return NextResponse.json({ error: "Maintenance request not found" }, { status: 404 });
    }

    if (role === "landlord") {
      // Verify landlord owns the property
      const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("id", req.property_id)
        .eq("landlord_id", userId)
        .single();

      if (!property) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Tenant: verify clerk_user_id matches the request's tenant
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("id", req.tenant_id)
        .eq("clerk_user_id", userId)
        .single();

      if (!tenant) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data: task, error } = await supabase
      .from("scheduling_tasks")
      .select("*")
      .eq("request_id", requestId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[scheduling/tasks GET] error:", error);
      return NextResponse.json({ error: "Failed to fetch scheduling task" }, { status: 500 });
    }

    return NextResponse.json({ task: task ?? null });
  } catch (err) {
    console.error("[scheduling/tasks GET] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/scheduling/tasks
// Create a new scheduling task. Called from the dispatch route (T-114).
// Requires landlord role.
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json({ error: "Forbidden: landlord role required" }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = createSchedulingTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { request_id, vendor_id, tenant_id } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Verify landlord owns the property for this request
    const { data: req } = await supabase
      .from("maintenance_requests")
      .select("property_id")
      .eq("id", request_id)
      .single();

    if (!req) {
      return NextResponse.json({ error: "Maintenance request not found" }, { status: 404 });
    }

    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", req.property_id)
      .eq("landlord_id", userId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: task, error } = await supabase
      .from("scheduling_tasks")
      .insert({
        request_id,
        vendor_id,
        tenant_id,
        status: "awaiting_tenant",
      })
      .select()
      .single();

    if (error) {
      console.error("[scheduling/tasks POST] insert error:", error);
      return NextResponse.json({ error: "Failed to create scheduling task" }, { status: 500 });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("[scheduling/tasks POST] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
