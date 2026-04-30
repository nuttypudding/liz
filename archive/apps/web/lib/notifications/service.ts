import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "./transports/email";
import { sendSms } from "./transports/sms";
import { sendInApp } from "./transports/in-app";

export type NotificationRecipientType = "landlord" | "tenant" | "vendor";
export type NotificationChannel = "email" | "sms" | "in_app";

export async function sendNotification(
  recipientType: NotificationRecipientType,
  recipientId: string,
  channel: NotificationChannel,
  template: string,
  templateData: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const to = typeof templateData.to === "string" ? templateData.to : "";

  let result: { success: boolean; messageId?: string; error?: string };
  switch (channel) {
    case "email":
      result = await sendEmail(to, template, templateData);
      break;
    case "sms":
      result = await sendSms(to, template, templateData);
      break;
    case "in_app":
      result = await sendInApp(recipientId, template, templateData);
      break;
    default:
      result = { success: false, error: `Unknown channel: ${channel}` };
  }

  // Always log send attempt (success or failure)
  try {
    const supabase = createServerSupabaseClient();
    await supabase.from("notification_log").insert({
      recipient_type: recipientType,
      recipient_id: recipientId,
      channel,
      template,
      sent_at: new Date().toISOString(),
      status: result.success ? "sent" : "failed",
    });
  } catch (logErr) {
    console.error("[notifications] Failed to write to notification_log:", logErr);
  }

  return result;
}
