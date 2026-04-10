export type NotificationType =
  | "schedule-confirmed"
  | "availability-prompt"
  | "reschedule-request";

export interface NotificationPayload {
  type: NotificationType;
  to: string;
  data: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface INotificationTransport {
  send(payload: NotificationPayload): Promise<NotificationResult>;
}
