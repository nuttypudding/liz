import { ResendEmailTransport } from "./email";
import { TwilioSmsTransport } from "./sms";
import type { NotificationResult } from "./types";

export type { INotificationTransport, NotificationPayload, NotificationResult } from "./types";

export class NotificationService {
  private email: ResendEmailTransport;
  private sms: TwilioSmsTransport;

  constructor() {
    this.email = new ResendEmailTransport();
    this.sms = new TwilioSmsTransport();
  }

  async sendScheduleConfirmation(
    to: string,
    channel: "email" | "sms",
    data: { appointmentTime: string; vendorName: string; address: string }
  ): Promise<NotificationResult> {
    const transport = channel === "email" ? this.email : this.sms;
    return transport.send({
      type: "schedule-confirmed",
      to,
      data,
    });
  }

  async sendAvailabilityPrompt(
    to: string,
    channel: "email" | "sms",
    data: { requestId: string; requestType: string }
  ): Promise<NotificationResult> {
    const transport = channel === "email" ? this.email : this.sms;
    return transport.send({
      type: "availability-prompt",
      to,
      data,
    });
  }

  async sendRescheduleRequest(
    to: string,
    channel: "email" | "sms",
    data: { schedulingTaskId: string; rescheduleToken: string }
  ): Promise<NotificationResult> {
    const transport = channel === "email" ? this.email : this.sms;
    return transport.send({
      type: "reschedule-request",
      to,
      data,
    });
  }
}

export const notificationService = new NotificationService();
