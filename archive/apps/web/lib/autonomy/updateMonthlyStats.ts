import { SupabaseClient } from "@supabase/supabase-js";

export interface StatsDelta {
  total_decisions?: number;
  auto_dispatched?: number;
  escalated?: number;
  overridden?: number;
  total_spend?: number;
}

/**
 * Incrementally update monthly autonomy stats for a landlord.
 * Fetches the existing record, applies the delta, recalculates trust_score, and upserts.
 * month param must be in YYYY-MM format.
 */
export async function updateMonthlyStats(
  supabase: SupabaseClient,
  landlord_id: string,
  month: string,
  delta: StatsDelta
): Promise<void> {
  const monthStart = `${month}-01`;

  const { data: existing } = await supabase
    .from("autonomy_monthly_stats")
    .select("*")
    .eq("landlord_id", landlord_id)
    .eq("month", monthStart)
    .single();

  const current = existing ?? {
    total_decisions: 0,
    auto_dispatched: 0,
    escalated: 0,
    overridden: 0,
    total_spend: 0,
  };

  const newTotalDecisions = current.total_decisions + (delta.total_decisions ?? 0);
  const newOverridden = current.overridden + (delta.overridden ?? 0);

  const trust_score =
    newTotalDecisions > 0
      ? Math.max(0, Math.min(1, 1 - newOverridden / newTotalDecisions))
      : null;

  const statsData = {
    landlord_id,
    month: monthStart,
    total_decisions: newTotalDecisions,
    auto_dispatched: current.auto_dispatched + (delta.auto_dispatched ?? 0),
    escalated: current.escalated + (delta.escalated ?? 0),
    overridden: newOverridden,
    total_spend: Number(current.total_spend) + (delta.total_spend ?? 0),
    trust_score,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("autonomy_monthly_stats")
      .update(statsData)
      .eq("landlord_id", landlord_id)
      .eq("month", monthStart);

    if (error) {
      console.error("Failed to update autonomy_monthly_stats:", error);
    }
  } else {
    const { error } = await supabase.from("autonomy_monthly_stats").insert({
      id: crypto.randomUUID(),
      ...statsData,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to insert autonomy_monthly_stats:", error);
    }
  }
}

/** Extract YYYY-MM from an ISO 8601 date string. */
export function monthFromIso(isoDate: string): string {
  return isoDate.substring(0, 7);
}
