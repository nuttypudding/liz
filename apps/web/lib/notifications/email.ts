import { Resend } from "resend";
import type {
  INotificationTransport,
  NotificationPayload,
  NotificationResult,
} from "./types";

export class ResendEmailTransport implements INotificationTransport {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    try {
      const result = await this.resend.emails.send({
        from: "noreply@liz-landlord.app",
        to: payload.to,
        subject: this.getSubject(payload.type),
        html: this.renderTemplate(payload.type, payload.data),
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

  private getSubject(type: string): string {
    const subjects: Record<string, string> = {
      "schedule-confirmed": "Your appointment is scheduled",
      "availability-prompt": "Please confirm your availability",
      "reschedule-request": "A reschedule has been requested",
    };
    return subjects[type] ?? "Notification from Liz";
  }

  private renderTemplate(
    type: string,
    _data: Record<string, string>
  ): string {
    // TODO: Use React Email templates (task 106)
    return `<p>Notification type: ${type}</p>`;
  }
}
