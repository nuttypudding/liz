import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const MONTH_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])$/;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthEndExclusive(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(year, mon, 1); // first day of next month
  return d.toISOString().substring(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");

    let month: string;
    if (monthParam) {
      if (!MONTH_REGEX.test(monthParam)) {
        return NextResponse.json(
          { error: "Invalid month format. Use YYYY-MM" },
          { status: 400 }
        );
      }
      month = monthParam;
    } else {
      month = currentMonth();
    }

    const monthStart = `${month}-01`;
    const supabase = createServerSupabaseClient();

    // Try to fetch pre-computed stats record
    const { data: statsRecord, error: statsError } = await supabase
      .from("autonomy_monthly_stats")
      .select("*")
      .eq("landlord_id", userId)
      .eq("month", monthStart)
      .single();

    if (statsError && statsError.code !== "PGRST116") {
      console.error("Supabase query error:", statsError);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    if (statsRecord) {
      return NextResponse.json({ stats: statsRecord });
    }

    // Compute on-the-fly from autonomous_decisions
    const monthEndStr = monthEndExclusive(month);

    const { data: decisions, error: decisionsError } = await supabase
      .from("autonomous_decisions")
      .select("decision_type, status, actions_taken")
      .eq("landlord_id", userId)
      .gte("created_at", `${monthStart}T00:00:00.000Z`)
      .lt("created_at", `${monthEndStr}T00:00:00.000Z`);

    if (decisionsError) {
      console.error("Supabase query error:", decisionsError);
      return NextResponse.json({ error: "Failed to compute stats" }, { status: 500 });
    }

    const rows = decisions ?? [];
    const total_decisions = rows.length;
    const auto_dispatched = rows.filter(
      (d) => d.decision_type === "dispatch" && d.status === "confirmed"
    ).length;
    const escalated = rows.filter((d) => d.decision_type === "escalate").length;
    const overridden = rows.filter((d) => d.status === "overridden").length;
    const total_spend = rows.reduce((sum, d) => {
      const cost = (d.actions_taken as Record<string, unknown> | null)?.estimated_cost;
      return sum + (typeof cost === "number" ? cost : 0);
    }, 0);

    const trust_score =
      total_decisions > 0
        ? Math.max(0, Math.min(1, 1 - overridden / total_decisions))
        : null;

    return NextResponse.json({
      stats: {
        id: null,
        landlord_id: userId,
        month: monthStart,
        total_decisions,
        auto_dispatched,
        escalated,
        overridden,
        total_spend,
        trust_score,
        created_at: null,
        updated_at: null,
      },
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/autonomy/stats:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
