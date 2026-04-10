---
id: 105
title: Notification service — Resend email + Twilio SMS transport layer
tier: Sonnet
depends_on: []
feature: P2-002-auto-scheduling-vendors
---

# 105 — Notification Service

## Objective

Build a `NotificationService` abstraction that wraps email (Resend) and SMS (Twilio) transports. API routes will call `notificationService.sendScheduleConfirmation(...)` without knowing which transport is used.

## Context

The scheduling feature sends notifications to vendors, tenants, and landlords via email and SMS. Using an abstraction layer allows:
- Decoupling transports from business logic
- Swapping implementations (e.g., adding push notifications later)
- Testing without calling external services

Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation

### 1. Install dependencies

```bash
cd apps/web
npm install resend twilio
```

### 2. Create `apps/web/lib/notifications/index.ts`

```typescript
import { ResendEmailTransport } from "./email";
import { TwilioSmsTransport } from "./sms";
import { type NotificationPayload, type NotificationResult } from "./types";

export interface INotificationTransport {
  send(payload: NotificationPayload): Promise<NotificationResult>;
}

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
```

### 3. Create `apps/web/lib/notifications/types.ts`

```typescript
export type NotificationType = "schedule-confirmed" | "availability-prompt" | "reschedule-request";

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
```

### 4. Create `apps/web/lib/notifications/email.ts`

```typescript
import { Resend } from "resend";
import { type INotificationTransport, type NotificationPayload, type NotificationResult } from "./types";

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
    return subjects[type] || "Notification from Liz";
  }

  private renderTemplate(type: string, data: Record<string, string>): string {
    // TODO: Use React Email templates (task 106)
    return `<p>Notification type: ${type}</p>`;
  }
}
```

### 5. Create `apps/web/lib/notifications/sms.ts`

```typescript
import twilio from "twilio";
import { type INotificationTransport, type NotificationPayload, type NotificationResult } from "./types";

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

  private renderSmsBody(type: string, data: Record<string, string>): string {
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
```

### 6. Environment variables

Update `.env.local`:

```
RESEND_API_KEY=re_test_key_here
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] NotificationService class created with three send methods
3. [ ] Resend email transport implemented
4. [ ] Twilio SMS transport implemented
5. [ ] Environment variables set in `.env.local`
6. [ ] No build errors
7. [ ] Service can be imported and instantiated
