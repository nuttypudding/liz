import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reviewDecisionSchema } from "@/lib/validations";
import { updateMonthlyStats, monthFromIso } from "@/lib/autonomy/updateMonthlyStats";
import { handleOverride } from "@/lib/autonomy/override";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const body: unknown = await request.json();
    const parsed = reviewDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Fetch the decision and verify ownership
    const { data: existingDecision, error: fetchError } = await supabase
      .from("autonomous_decisions")
      .select("id, decision_type, created_at")
      .eq("id", id)
      .eq("landlord_id", userId)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      return NextResponse.json(
        { error: "Decision not found" },
        { status: 404 }
      );
    }

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch decision" },
        { status: 500 }
      );
    }

    // Update decision record
    const updateData = {
      status: parsed.data.review_action === "confirmed" ? "confirmed" : "overridden",
      review_action: parsed.data.review_action,
      review_notes: parsed.data.review_notes || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("autonomous_decisions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Failed to update decision" },
        { status: 500 }
      );
    }

    // Increment monthly stats (non-blocking)
    const month = monthFromIso(existingDecision.created_at);
    const isConfirmedDispatch =
      parsed.data.review_action === "confirmed" &&
      existingDecision.decision_type === "dispatch";
    updateMonthlyStats(supabase, userId, month, {
      auto_dispatched: isConfirmedDispatch ? 1 : 0,
      overridden: parsed.data.review_action === "overridden" ? 1 : 0,
    }).catch((err) => console.error("updateMonthlyStats failed:", err));

    // Override side-effects: rollback check, feedback recording, cooldown
    let withinRollbackWindow = false;
    if (parsed.data.review_action === "overridden") {
      const { data: settings } = await supabase
        .from("autonomy_settings")
        .select("rollback_window_hours")
        .eq("landlord_id", userId)
        .single();

      const rollbackWindowHours = settings?.rollback_window_hours ?? 24;

      const result = await handleOverride(
        supabase,
        id,
        existingDecision.created_at,
        userId,
        rollbackWindowHours,
        parsed.data.review_notes
      );
      withinRollbackWindow = result.withinWindow;
    }

    return NextResponse.json({ decision: data, within_rollback_window: withinRollbackWindow });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/autonomy/decisions/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
