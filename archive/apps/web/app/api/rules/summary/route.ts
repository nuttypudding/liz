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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Count active rules
    const { count: activeRules, error: rulesError } = await supabase
      .from("automation_rules")
      .select("id", { count: "exact", head: true })
      .eq("landlord_id", userId)
      .eq("enabled", true);

    if (rulesError) {
      return NextResponse.json({ error: "Failed to fetch rules summary" }, { status: 500 });
    }

    // Count all logs in last 30 days
    const { count: totalProcessed, error: totalError } = await supabase
      .from("rule_execution_logs")
      .select("id", { count: "exact", head: true })
      .eq("landlord_id", userId)
      .gte("evaluated_at", thirtyDaysAgo);

    if (totalError) {
      return NextResponse.json({ error: "Failed to fetch rules summary" }, { status: 500 });
    }

    // Count matched logs with auto_approve action in last 30 days
    const { data: autoApprovedLogs, error: autoError } = await supabase
      .from("rule_execution_logs")
      .select("actions_executed")
      .eq("landlord_id", userId)
      .eq("matched", true)
      .gte("evaluated_at", thirtyDaysAgo);

    if (autoError) {
      return NextResponse.json({ error: "Failed to fetch rules summary" }, { status: 500 });
    }

    const autoApprovedThisMonth = (autoApprovedLogs ?? []).filter((row) => {
      const actions = row.actions_executed as { action: string }[] | null;
      return Array.isArray(actions) && actions.some((a) => a.action === "auto_approve");
    }).length;

    return NextResponse.json({
      active_rules: activeRules ?? 0,
      auto_approved_this_month: autoApprovedThisMonth,
      total_processed_this_month: totalProcessed ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
