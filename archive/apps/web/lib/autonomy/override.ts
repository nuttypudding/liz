import { SupabaseClient } from "@supabase/supabase-js";

const COOLDOWN_HOURS = 24;

/**
 * Handles the side-effects of a landlord overriding an autonomous decision:
 * 1. Checks if the decision is within the rollback window (logs accordingly)
 * 2. Records feedback in autonomy_feedback for AI learning
 * 3. Sets a cooldown on autonomy_settings (blocks auto-dispatch for 24h)
 *
 * All operations are best-effort — failures are logged but never throw,
 * so the override itself always succeeds.
 *
 * @returns { withinWindow } — true if decision was within rollback_window_hours
 */
export async function handleOverride(
  supabase: SupabaseClient,
  decisionId: string,
  decisionCreatedAt: string,
  landlordId: string,
  rollbackWindowHours: number,
  reviewNotes?: string
): Promise<{ withinWindow: boolean }> {
  const now = new Date();
  const createdAt = new Date(decisionCreatedAt);
  const ageMs = now.getTime() - createdAt.getTime();
  const windowMs = rollbackWindowHours * 60 * 60 * 1000;
  const withinWindow = ageMs < windowMs;

  // Log rollback window result
  if (withinWindow) {
    console.log(
      `[override] Decision ${decisionId} overridden within rollback window (${Math.round(ageMs / 3600000)}h < ${rollbackWindowHours}h). ` +
        `No vendor API integration present — dispatch is DB-only.`
    );
  } else {
    console.log(
      `[override] Decision ${decisionId} overridden outside rollback window (${Math.round(ageMs / 3600000)}h >= ${rollbackWindowHours}h). No rollback attempted.`
    );
  }

  // Record feedback (non-blocking)
  supabase
    .from("autonomy_feedback")
    .insert({
      decision_id: decisionId,
      landlord_id: landlordId,
      feedback_type: "override",
      reason_text: reviewNotes ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("[override] Failed to record feedback:", error);
    });

  // Set cooldown on autonomy_settings (non-blocking)
  const cooldownUntil = new Date(now.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  supabase
    .from("autonomy_settings")
    .update({ cooldown_until: cooldownUntil, updated_at: now.toISOString() })
    .eq("landlord_id", landlordId)
    .then(({ error }) => {
      if (error) console.error("[override] Failed to set cooldown:", error);
      else console.log(`[override] Cooldown set until ${cooldownUntil} for landlord ${landlordId}`);
    });

  return { withinWindow };
}
