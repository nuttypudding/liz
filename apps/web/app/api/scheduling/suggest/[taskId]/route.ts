import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { suggestSchedulingSlots, TenantSlot, VendorAvailabilityRule } from "@/lib/scheduling/ai-matcher";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/scheduling/suggest/[taskId]
// Returns AI-ranked appointment slot suggestions for a scheduling task.
// Requires landlord role.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json({ error: "Forbidden: landlord role required" }, { status: 403 });
    }

    const { taskId } = await params;
    const supabase = createServerSupabaseClient();

    // Fetch task with related request info
    const { data: task, error: taskError } = await supabase
      .from("scheduling_tasks")
      .select("*, maintenance_requests(category, urgency, property_id)")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Scheduling task not found" }, { status: 404 });
    }

    // Verify landlord owns the property
    const req = task.maintenance_requests as { category: string; urgency: string; property_id: string } | null;
    if (!req) {
      return NextResponse.json({ error: "Associated request not found" }, { status: 404 });
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

    // Fetch vendor availability rules
    const { data: availabilityRules } = await supabase
      .from("vendor_availability_rules")
      .select("day_of_week, start_time, end_time, timezone")
      .eq("vendor_id", task.vendor_id);

    const vendorAvailability: VendorAvailabilityRule[] = (availabilityRules ?? []).map((r) => ({
      day_of_week: r.day_of_week,
      start_time: r.start_time,
      end_time: r.end_time,
      timezone: r.timezone,
    }));

    const tenantAvailability: TenantSlot[] = Array.isArray(task.tenant_availability)
      ? (task.tenant_availability as TenantSlot[])
      : [];

    // Fetch landlord timezone from profile
    const { data: profile } = await supabase
      .from("landlord_profiles")
      .select("timezone")
      .eq("landlord_id", userId)
      .single();

    const landlordTimezone = (profile as { timezone?: string } | null)?.timezone ?? "UTC";

    const result = await suggestSchedulingSlots(
      req.category,
      vendorAvailability,
      tenantAvailability,
      req.urgency as "low" | "medium" | "emergency",
      landlordTimezone
    );

    return NextResponse.json({ suggestions: result.suggestions, noOverlapReason: result.noOverlapReason ?? null });
  } catch (err) {
    console.error("[scheduling/suggest] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
