import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/reschedule/verify-token/[token]
// Public endpoint — validates a reschedule token and returns appointment details.
// No authentication required; token acts as the access credential.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createServerSupabaseClient();

    const { data: tokenRow, error: tokenError } = await supabase
      .from("reschedule_tokens")
      .select("id, task_id, expires_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "This link has expired" }, { status: 401 });
    }

    // Fetch scheduling task with appointment details
    const { data: task, error: taskError } = await supabase
      .from("scheduling_tasks")
      .select(
        `
        id,
        status,
        scheduled_date,
        scheduled_time_start,
        scheduled_time_end,
        maintenance_requests!inner (
          ai_category,
          work_order_text,
          properties!inner (
            address_line1,
            apt_or_unit_no,
            city,
            state,
            postal_code
          )
        )
      `
      )
      .eq("id", tokenRow.task_id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Scheduling task not found" }, { status: 404 });
    }

    return NextResponse.json({ taskId: tokenRow.task_id, task });
  } catch (err) {
    console.error("[reschedule/verify-token] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
