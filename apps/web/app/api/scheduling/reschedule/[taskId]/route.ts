import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { sendNotification } from "@/lib/notifications/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rescheduleSchema } from "@/lib/validations";

// POST /api/scheduling/reschedule/[taskId]
// Any authenticated party can request a reschedule.
// Moves task to 'rescheduling' and notifies the landlord.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body: unknown = await request.json();
    const parsed = rescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reason, requestedBy } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Fetch task
    const { data: task, error: taskError } = await supabase
      .from("scheduling_tasks")
      .select("*, maintenance_requests(property_id)")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Scheduling task not found" }, { status: 404 });
    }

    // Only allow rescheduling from certain statuses
    const reschedulableStatuses = ["confirmed", "awaiting_vendor", "awaiting_tenant", "pending"];
    if (!reschedulableStatuses.includes(task.status)) {
      return NextResponse.json(
        { error: `Cannot reschedule task in '${task.status}' status` },
        { status: 422 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("scheduling_tasks")
      .update({
        status: "rescheduling",
        reschedule_count: (task.reschedule_count ?? 0) + 1,
        // Clear previous confirmed slot so scheduling starts fresh
        scheduled_date: null,
        scheduled_time_start: null,
        scheduled_time_end: null,
        tenant_availability: null,
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      console.error("[scheduling/reschedule] update error:", updateError);
      return NextResponse.json({ error: "Failed to update scheduling task" }, { status: 500 });
    }

    // Notify landlord about the reschedule request
    const req = task.maintenance_requests as { property_id: string } | null;
    if (req) {
      const { data: property } = await supabase
        .from("properties")
        .select("landlord_id")
        .eq("id", req.property_id)
        .single();

      if (property?.landlord_id) {
        const { data: landlordUser } = await supabase
          .from("users")
          .select("email")
          .eq("id", property.landlord_id)
          .single();

        if (landlordUser?.email) {
          await sendNotification(
            "landlord",
            property.landlord_id,
            "email",
            "reschedule-request",
            {
              to: (landlordUser as { email: string }).email,
              taskId,
              requestedBy,
              reason: reason ?? "No reason provided",
              rescheduleCount: updated.reschedule_count,
            }
          );
        }
      }
    }

    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error("[scheduling/reschedule] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
