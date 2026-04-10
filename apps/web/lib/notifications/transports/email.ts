import { Resend } from "resend";

export async function sendEmail(
  to: string,
  template: string,
  templateData: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[notifications] RESEND_API_KEY not set — skipping email send");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: "noreply@liz-landlord.app",
      to,
      subject: getEmailSubject(template),
      html: renderEmailHtml(template, templateData),
    });

    return {
      success: !result.error,
      messageId: result.data?.id,
      error: result.error?.message,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function getEmailSubject(template: string): string {
  const subjects: Record<string, string> = {
    "schedule-confirmed": "Your appointment is scheduled",
    "availability-prompt": "Please confirm your availability",
    "reschedule-request": "A reschedule has been requested",
  };
  return subjects[template] ?? "Notification from Liz";
}

function renderEmailHtml(template: string, _data: Record<string, unknown>): string {
  // TODO: Use React Email templates (task 108)
  return `<p>Notification: ${template}</p>`;
}
