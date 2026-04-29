import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sendNotification } from "@/lib/notifications/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const submitSchema = z.object({
  token: z.string().min(1),
  reason: z.string().max(300).optional(),
});

// POST /api/reschedule/submit
// Public endpoint — vendors submit a reschedule request via their token link.
// The token acts as the access credential (no Clerk auth required).
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { token, reason } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Validate token
    const { data: tokenRow, error: tokenError } = await supabase
      .from("reschedule_tokens")
      .select("id, task_id, expires_at, request_count, last_request_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "This link has expired" }, { status: 401 });
    }

    // Rate limit: max 5 requests per 24 hours per token
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const withinWindow =
      tokenRow.last_request_at && new Date(tokenRow.last_request_at) > windowStart;
    if (withinWindow && tokenRow.request_count >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "Too many requests. Please contact your landlord directly." },
        { status: 429 }
      );
    }

    const taskId = tokenRow.task_id as string;

    // Fetch task for status check and notification context
    const { data: task, error: taskError } = await supabase
      .from("scheduling_tasks")
      .select("*, maintenance_requests(property_id)")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Scheduling task not found" }, { status: 404 });
    }

    const reschedulableStatuses = ["confirmed", "awaiting_vendor", "awaiting_tenant", "pending"];
    if (!reschedulableStatuses.includes(task.status as string)) {
      return NextResponse.json(
        { error: `Cannot reschedule in '${task.status}' status` },
        { status: 422 }
      );
    }

    // Update task to rescheduling status
    const { data: updated, error: updateError } = await supabase
      .from("scheduling_tasks")
      .update({
        status: "rescheduling",
        reschedule_count: ((task.reschedule_count as number) ?? 0) + 1,
        scheduled_date: null,
        scheduled_time_start: null,
        scheduled_time_end: null,
        tenant_availability: null,
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      console.error("[reschedule/submit] update error:", updateError);
      return NextResponse.json({ error: "Failed to submit reschedule request" }, { status: 500 });
    }

    // Update rate limit counters on the token
    const resetCount = withinWindow ? false : true;
    await supabase
      .from("reschedule_tokens")
      .update({
        request_count: resetCount ? 1 : tokenRow.request_count + 1,
        last_request_at: new Date().toISOString(),
      })
      .eq("id", tokenRow.id);

    // Notify landlord
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
            property.landlord_id as string,
            "email",
            "reschedule-request",
            {
              to: (landlordUser as { email: string }).email,
              taskId,
              requestedBy: "vendor",
              reason: reason ?? "No reason provided",
              rescheduleCount: updated.reschedule_count,
            }
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reschedule/submit] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
