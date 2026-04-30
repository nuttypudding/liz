import twilio from "twilio";
import type {
  INotificationTransport,
  NotificationPayload,
  NotificationResult,
} from "./types";

export class TwilioSmsTransport implements INotificationTransport {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    try {
      const message = await this.client.messages.create({
        body: this.renderSmsBody(payload.type, payload.data),
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: payload.to,
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

  private renderSmsBody(
    type: string,
    data: Record<string, string>
  ): string {
    switch (type) {
      case "schedule-confirmed":
        return `Your appointment is scheduled for ${data.appointmentTime} at ${data.address}. -Liz`;
      case "availability-prompt":
        return `Please confirm your availability for the repair request. Reply or visit: [link] -Liz`;
      case "reschedule-request":
        return `A reschedule has been requested. Please confirm: [link] -Liz`;
      default:
        return "You have a notification from Liz.";
    }
  }
}
