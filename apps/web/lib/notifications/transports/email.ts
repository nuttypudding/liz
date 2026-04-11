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
    "emergency-auto-dispatch": "Emergency request auto-dispatched",
    "auto-dispatch-confirmation": "Maintenance request auto-dispatched",
  };
  return subjects[template] ?? "Notification from Liz";
}

function renderEmailHtml(template: string, data: Record<string, unknown>): string {
  // TODO: Use React Email templates (task 108)
  switch (template) {
    case "emergency-auto-dispatch":
      return [
        `<h2>⚠️ Emergency Request Auto-Dispatched</h2>`,
        `<p><strong>Tenant:</strong> ${data.tenantName}</p>`,
        `<p><strong>Property:</strong> ${data.propertyName}</p>`,
        `<p><strong>Issue category:</strong> ${data.category} (emergency)</p>`,
        `<p><strong>Vendor notified:</strong> ${data.vendorName}</p>`,
        `<p><a href="${data.requestLink}">View request details</a></p>`,
        `<p style="color:#888;font-size:12px">This action was taken automatically by Liz Autopilot. You can override it from the request detail page.</p>`,
      ].join("");
    case "auto-dispatch-confirmation":
      return [
        `<h2>Maintenance Request Auto-Dispatched</h2>`,
        `<p><strong>Tenant:</strong> ${data.tenantName}</p>`,
        `<p><strong>Property:</strong> ${data.propertyName}</p>`,
        `<p><strong>Issue category:</strong> ${data.category}</p>`,
        `<p><strong>Vendor notified:</strong> ${data.vendorName}</p>`,
        `<p><a href="${data.requestLink}">View request details</a></p>`,
        `<p style="color:#888;font-size:12px">This action was taken automatically by Liz Autopilot. You can override it from the request detail page.</p>`,
      ].join("");
    default:
      return `<p>Notification: ${template}</p>`;
  }
}
