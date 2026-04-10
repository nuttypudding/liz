import { render } from "@react-email/render";
import { Resend } from "resend";
import { AvailabilityPrompt } from "@/emails/availability-prompt";
import { RescheduleRequest } from "@/emails/reschedule-request";
import { ScheduleConfirmed } from "@/emails/schedule-confirmed";
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
      const html = await this.renderTemplate(payload.type, payload.data);
      const result = await this.resend.emails.send({
        from: "noreply@liz-landlord.app",
        to: payload.to,
        subject: this.getSubject(payload.type),
        html,
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

  private async renderTemplate(
    type: string,
    data: Record<string, string>
  ): Promise<string> {
    switch (type) {
      case "schedule-confirmed":
        return render(
          ScheduleConfirmed({
            workOrderId: data.workOrderId ?? "",
            workOrderTitle: data.workOrderTitle ?? "",
            propertyAddress: data.propertyAddress ?? "",
            vendorName: data.vendorName ?? "",
            scheduledDate: data.scheduledDate ?? "",
            scheduledTimeStart: data.scheduledTimeStart ?? "",
            scheduledTimeEnd: data.scheduledTimeEnd ?? "",
            landlordName: data.landlordName ?? "",
            detailsUrl: data.detailsUrl ?? "",
          })
        );
      case "availability-prompt":
        return render(
          AvailabilityPrompt({
            tenantName: data.tenantName ?? "",
            workOrderTitle: data.workOrderTitle ?? "",
            propertyAddress: data.propertyAddress ?? "",
            availabilityDeadline: data.availabilityDeadline ?? "",
            tenantResponseLink: data.tenantResponseLink ?? "",
            suggestedWindows: data.suggestedWindows
              ? JSON.parse(data.suggestedWindows)
              : [],
          })
        );
      case "reschedule-request":
        return render(
          RescheduleRequest({
            landlordName: data.landlordName ?? "",
            vendorName: data.vendorName ?? "",
            currentAppointmentDate: data.currentAppointmentDate ?? "",
            currentAppointmentTimeStart: data.currentAppointmentTimeStart ?? "",
            currentAppointmentTimeEnd: data.currentAppointmentTimeEnd ?? "",
            originalWorkOrderTitle: data.originalWorkOrderTitle ?? "",
            vendorReason: data.vendorReason,
            rescheduleLink: data.rescheduleLink ?? "",
          })
        );
      default:
        return `<p>Notification type: ${type}</p>`;
    }
  }
}
