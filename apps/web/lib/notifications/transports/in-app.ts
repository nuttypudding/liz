// Placeholder for future in-app (push/websocket) notifications.
// Delivery is recorded via the notification_log in service.ts.
export async function sendInApp(
  recipientId: string,
  template: string,
  _templateData: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  console.info(`[notifications] in-app placeholder: ${template} for recipient ${recipientId}`);
  return { success: true };
}
