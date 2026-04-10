---
id: 107
title: Notification service — Resend email + Twilio SMS transport layer
tier: Sonnet
depends_on: []
feature: P2-002-auto-scheduling-vendors
---

# 107 — Notification Service — Resend Email + Twilio SMS Transport Layer

## Objective
Create a reusable notification service with pluggable transports (email via Resend, SMS via Twilio) and graceful fallback when credentials are unavailable.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create `apps/web/lib/notifications/service.ts`:
   - Export `sendNotification()` async function with signature:
     ```typescript
     async function sendNotification(
       recipientType: NotificationRecipientType,
       recipientId: string,
       channel: NotificationChannel,
       template: string,
       templateData: Record<string, any>
     ): Promise<{ success: boolean; messageId?: string; error?: string }>
     ```
   - Route to appropriate transport based on channel (email/sms/in_app)
   - Always log send attempt to notification_log table (success or failure)
   - Handle missing environment variables gracefully (log warning, return { success: false })

2. Create `apps/web/lib/notifications/transports/email.ts`:
   - Use Resend SDK (`resend` package)
   - Implement `sendEmail()` function that:
     - Takes email address, template name, and template data
     - Resolves template to React component
     - Renders React Email template to HTML
     - Sends via Resend API
     - Returns messageId on success
     - Gracefully skips if `RESEND_API_KEY` not set

3. Create `apps/web/lib/notifications/transports/sms.ts`:
   - Use Twilio SDK (`twilio` package)
   - Implement `sendSMS()` function that:
     - Takes phone number, template name, and template data
     - Formats template data into plain text SMS
     - Sends via Twilio API
     - Returns messageId on success
     - Gracefully skips if `TWILIO_ACCOUNT_SID` or `TWILIO_AUTH_TOKEN` not set

4. Create `apps/web/lib/notifications/transports/in-app.ts`:
   - Implement placeholder for future in-app notifications
   - For now, just log to database

5. Error handling:
   - All failures logged to notification_log table
   - All successes logged with status='sent'
   - Failures logged with status='failed'

## Acceptance Criteria
1. [ ] `sendNotification()` function callable and routes correctly by channel
2. [ ] Email transport sends via Resend when credentials available
3. [ ] SMS transport sends via Twilio when credentials available
4. [ ] Graceful fallback when env vars missing (log warning, return success:false)
5. [ ] All sends logged to notification_log table
6. [ ] In-app transport placeholder created
7. [ ] No unhandled promise rejections
