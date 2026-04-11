import twilio from "twilio";

export async function sendSms(
  to: string,
  template: string,
  templateData: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("[notifications] Twilio credentials not set — skipping SMS send");
    return { success: false, error: "Twilio credentials not configured" };
  }

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({
      body: renderSmsBody(template, templateData),
      from: process.env.TWILIO_PHONE_NUMBER!,
      to,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function renderSmsBody(template: string, data: Record<string, unknown>): string {
  switch (template) {
    case "schedule-confirmed":
      return `Your appointment is scheduled for ${data.appointmentTime} at ${data.address}. -Liz`;
    case "availability-prompt":
      return `Please confirm your availability for the repair request. -Liz`;
    case "reschedule-request":
      return `A reschedule has been requested. Please confirm: [link] -Liz`;
    case "emergency-auto-dispatch":
      return `[Liz] EMERGENCY auto-dispatched: ${data.category} at ${data.propertyName}. Tenant: ${data.tenantName}. Vendor: ${data.vendorName}. Details: ${data.requestLink}`;
    case "auto-dispatch-confirmation":
      return `[Liz] Auto-dispatched: ${data.category} request from ${data.tenantName} at ${data.propertyName}. Vendor: ${data.vendorName}. Details: ${data.requestLink}`;
    default:
      return "You have a notification from Liz.";
  }
}
