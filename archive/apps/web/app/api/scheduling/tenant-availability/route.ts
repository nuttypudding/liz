import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tenantAvailabilitySubmitSchema } from "@/lib/validations";

// POST /api/scheduling/tenant-availability
// Tenant (or landlord on behalf of tenant) submits available time slots.
// Task must be in 'awaiting_tenant' status.
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = tenantAvailabilitySubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { taskId, availableSlots } = parsed.data;
    const supabase = createServerSupabaseClient();

    const { data: task, error: fetchError } = await supabase
      .from("scheduling_tasks")
      .select("id, status, tenant_id, vendor_id, request_id")
      .eq("id", taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: "Scheduling task not found" }, { status: 404 });
    }

    if (task.status !== "awaiting_tenant") {
      return NextResponse.json(
        { error: `Invalid status transition: task is '${task.status}', expected 'awaiting_tenant'` },
        { status: 422 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("scheduling_tasks")
      .update({
        status: "awaiting_vendor",
        tenant_availability: availableSlots,
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      console.error("[scheduling/tenant-availability] update error:", updateError);
      return NextResponse.json({ error: "Failed to update scheduling task" }, { status: 500 });
    }

    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error("[scheduling/tenant-availability] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
