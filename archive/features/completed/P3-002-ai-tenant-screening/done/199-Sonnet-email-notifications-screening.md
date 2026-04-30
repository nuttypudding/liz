---
id: 199
title: Email notification service integration (Resend)
tier: Sonnet
depends_on: []
feature: P3-002-ai-tenant-screening
---

# 199 — Email notification service integration (Resend)

## Objective
Set up Resend email service (if not already configured from P2-002). Create reusable email notification functions for screening events: application confirmation, landlord new application, applicant decision notification.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Assumes Resend service already set up (P2-002). If not, configure environment variables and API key.

## Implementation

### 1. Verify Resend setup

Check `apps/web/lib/email/resend.ts` or equivalent exists:

```bash
ls -la apps/web/lib/email/
```

If not present, create:

```typescript
// apps/web/lib/email/resend.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  try {
    const result = await resend.emails.send({
      from: params.from || process.env.EMAIL_FROM || 'noreply@liz.landlord.app',
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    return { success: !result.error, id: result.data?.id, error: result.error };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

### 2. Create screening email templates

Create `apps/web/lib/email/screening-templates.ts`:

```typescript
/**
 * Email templates for screening notifications
 */

export function applicationConfirmationEmail(params: {
  applicantName: string;
  trackingId: string;
  propertyAddress?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; }
    .content { margin: 20px 0; }
    .tracking-box { background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .tracking-id { font-size: 24px; font-weight: bold; color: #1e40af; font-family: monospace; }
    .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Received</h1>
    </div>

    <div class="content">
      <p>Hi ${params.applicantName},</p>

      <p>Thank you for submitting your rental application${params.propertyAddress ? ` for ${params.propertyAddress}` : ''}. Your application has been received and will be reviewed shortly.</p>

      <div class="tracking-box">
        <p><strong>Your Tracking ID:</strong></p>
        <div class="tracking-id">${params.trackingId}</div>
        <p style="font-size: 14px; color: #666; margin-top: 10px;">Use this ID to check your application status anytime.</p>
      </div>

      <p>What happens next?</p>
      <ul>
        <li>Your application will be screened, which typically takes 3–5 business days</li>
        <li>You may receive a request for additional information</li>
        <li>We will notify you of the decision via email</li>
      </ul>

      <p>If you have any questions, please reply to this email or contact the landlord directly.</p>

      <p>Best regards,<br>Liz Property Management</p>
    </div>

    <div class="footer">
      <p>This is an automated email. Please do not reply directly to this address.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function landlordNewApplicationEmail(params: {
  landlordName: string;
  applicantName: string;
  applicantEmail: string;
  propertyAddress: string;
  monthlyRent: number;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; }
    .app-card { background-color: #fff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Application Received</h1>
    </div>

    <div class="content">
      <p>Hi ${params.landlordName},</p>

      <p>A new rental application has been submitted for your property.</p>

      <div class="app-card">
        <p><strong>Applicant:</strong> ${params.applicantName}</p>
        <p><strong>Email:</strong> ${params.applicantEmail}</p>
        <p><strong>Property:</strong> ${params.propertyAddress}</p>
        <p><strong>Monthly Rent:</strong> $${params.monthlyRent.toLocaleString()}</p>
      </div>

      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/applications" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Review Application</a></p>

      <p>Log in to your dashboard to review the full application details and start the screening process.</p>

      <p>Best regards,<br>Liz Property Management</p>
    </div>

    <div class="footer">
      <p>This is an automated email. Please do not reply directly to this address.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function applicantDecisionEmail(params: {
  applicantName: string;
  decision: 'approved' | 'denied';
  message?: string;
}): string {
  const isApproved = params.decision === 'approved';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${isApproved ? '#dcfce7' : '#fee2e2'}; padding: 20px; text-align: center; border-radius: 8px; }
    .header h1 { color: ${isApproved ? '#166534' : '#7f1d1d'}; margin: 0; }
    .content { margin: 20px 0; }
    .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isApproved ? '✓ Application Approved' : 'Application Decision'}</h1>
    </div>

    <div class="content">
      <p>Hi ${params.applicantName},</p>

      ${isApproved
        ? `
      <p>Congratulations! Your rental application has been <strong>approved</strong>. The landlord will contact you shortly with next steps regarding the lease agreement and move-in process.</p>

      <p>Next steps:</p>
      <ul>
        <li>Review and sign the lease agreement</li>
        <li>Arrange move-in date and logistics</li>
        <li>Prepare required deposits and first month's rent</li>
      </ul>
      `
        : `
      <p>Thank you for your application. Unfortunately, your application has been <strong>denied</strong> at this time.</p>

      ${params.message ? `<p><strong>Note from Landlord:</strong><br>${params.message}</p>` : ''}

      <p>If you have questions about this decision, you may contact the landlord directly.</p>
      `}

      <p>We appreciate your interest and wish you the best in your housing search.</p>

      <p>Best regards,<br>Liz Property Management</p>
    </div>

    <div class="footer">
      <p>This is an automated email. Please do not reply directly to this address.</p>
    </div>
  </div>
</body>
</html>
  `;
}
```

### 3. Create service function

Create `apps/web/lib/email/screening-service.ts`:

```typescript
import { sendEmail } from './resend';
import {
  applicationConfirmationEmail,
  landlordNewApplicationEmail,
  applicantDecisionEmail,
} from './screening-templates';

/**
 * Send application confirmation to applicant
 */
export async function sendApplicationConfirmation(params: {
  applicantEmail: string;
  applicantName: string;
  trackingId: string;
  propertyAddress?: string;
}) {
  const html = applicationConfirmationEmail({
    applicantName: params.applicantName,
    trackingId: params.trackingId,
    propertyAddress: params.propertyAddress,
  });

  return sendEmail({
    to: params.applicantEmail,
    subject: `Application Received - Tracking ID: ${params.trackingId}`,
    html,
  });
}

/**
 * Notify landlord of new application
 */
export async function sendLandlordNewApplicationNotification(params: {
  landlordEmail: string;
  landlordName: string;
  applicantName: string;
  applicantEmail: string;
  propertyAddress: string;
  monthlyRent: number;
}) {
  const html = landlordNewApplicationEmail({
    landlordName: params.landlordName,
    applicantName: params.applicantName,
    applicantEmail: params.applicantEmail,
    propertyAddress: params.propertyAddress,
    monthlyRent: params.monthlyRent,
  });

  return sendEmail({
    to: params.landlordEmail,
    subject: `New Application: ${params.applicantName} - ${params.propertyAddress}`,
    html,
  });
}

/**
 * Send decision notification to applicant
 */
export async function sendApplicantDecisionNotification(params: {
  applicantEmail: string;
  applicantName: string;
  decision: 'approved' | 'denied';
  message?: string;
}) {
  const html = applicantDecisionEmail({
    applicantName: params.applicantName,
    decision: params.decision,
    message: params.message,
  });

  return sendEmail({
    to: params.applicantEmail,
    subject:
      params.decision === 'approved'
        ? 'Your Application Has Been Approved'
        : 'Application Decision',
    html,
  });
}
```

## Acceptance Criteria
1. [ ] Resend API configured (environment variables set)
2. [ ] sendEmail() function available
3. [ ] Three email templates created: confirmation, landlord notification, decision
4. [ ] applicationConfirmationEmail() template with tracking ID
5. [ ] landlordNewApplicationEmail() template with applicant details
6. [ ] applicantDecisionEmail() template with approval/denial message
7. [ ] Email service functions created and exported
8. [ ] HTML formatting professional and mobile-friendly
9. [ ] Emails branded with Liz logo/colors
10. [ ] Functions used in API routes (tasks 183, 186, 200)
