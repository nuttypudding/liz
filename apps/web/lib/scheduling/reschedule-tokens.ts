import crypto from "crypto";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const TOKEN_EXPIRY_HOURS = 72;

export function generateRescheduleToken(_taskId: string): { token: string; expiresAt: Date } {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);
  return { token, expiresAt };
}

export async function storeRescheduleToken(
  taskId: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("reschedule_tokens").insert({
    task_id: taskId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to store reschedule token: ${error.message}`);
  }

  return { token, expiresAt };
}
