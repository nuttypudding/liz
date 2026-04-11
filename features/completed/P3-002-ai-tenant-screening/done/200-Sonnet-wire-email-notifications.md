---
id: 200
title: Wire email notifications — confirmation, new app, decision
tier: Sonnet
depends_on: [199, 183, 186]
feature: P3-002-ai-tenant-screening
---

# 200 — Wire email notifications — confirmation, new app, decision

## Objective
Integrate email notifications into application submission, landlord notification, and decision APIs. Send confirmation to applicant on submit, notify landlord of new application, and notify applicant of decision (approve/deny).

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Wire email service functions (task 199) into API routes: task 183 (submit), task 186 (decide), and landlord retrieval flow.

## Implementation

### 1. Update application submission API (task 183)

Update `apps/web/app/api/applications/route.ts` POST handler:

```typescript
// Add to imports
import {
  sendApplicationConfirmation,
  sendLandlordNewApplicationNotification,
} from '@/lib/email/screening-service';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// In POST handler, after application creation:

const { data: application, error: insertError } = await supabase
  .from('applications')
  .insert([{ /* ... */ }])
  .select()
  .single();

if (insertError) {
  // ... error handling
}

// Send confirmation email to applicant
try {
  await sendApplicationConfirmation({
    applicantEmail: payload.email,
    applicantName: `${payload.first_name} ${payload.last_name}`,
    trackingId: application.tracking_id,
    propertyAddress: '', // Fetch from properties table if needed
  });
} catch (emailError) {
  console.error('Failed to send confirmation email:', emailError);
  // Non-fatal; application was created
}

// Notify landlord of new application
try {
  const { data: property } = await supabase
    .from('properties')
    .select('id, address')
    .eq('id', property_id)
    .single();

  const { data: landlord } = await supabase
    .from('landlord_profiles')
    .select('user_id')
    .eq('id', application.landlord_id)
    .single();

  if (property && landlord) {
    // Get user email from Clerk
    const user = await clerkClient.users.getUser(landlord.user_id);

    await sendLandlordNewApplicationNotification({
      landlordEmail: user.primaryEmailAddress?.emailAddress || '',
      landlordName: user.firstName || 'Landlord',
      applicantName: `${payload.first_name} ${payload.last_name}`,
      applicantEmail: payload.email,
      propertyAddress: property.address || 'Your Property',
      monthlyRent: payload.monthly_rent_applying_for,
    });
  }
} catch (emailError) {
  console.error('Failed to send landlord notification:', emailError);
  // Non-fatal
}

return NextResponse.json({
  success: true,
  tracking_id: application.tracking_id,
  message: 'Application submitted. Check your email for confirmation.',
}, { status: 201 });
```

### 2. Update decision API (task 186)

Update `apps/web/app/api/applications/[id]/decide/route.ts` POST handler:

```typescript
// Add to imports
import { sendApplicantDecisionNotification } from '@/lib/email/screening-service';

// After updating application status in decide endpoint:

const { data: updatedApplication, error: updateError } = await supabase
  .from('applications')
  .update({
    status: statusMap[payload.decision],
    updated_at: new Date().toISOString(),
  })
  .eq('id', params.id)
  .select()
  .single();

if (updateError) {
  // ... error handling
}

// Send decision notification to applicant
try {
  const decisionLabel = payload.decision === 'approve' ? 'approved' : 'denied';
  const optionalMessage =
    payload.decision === 'deny'
      ? payload.optional_message
      : payload.optional_message;

  await sendApplicantDecisionNotification({
    applicantEmail: updatedApplication.email,
    applicantName: `${updatedApplication.first_name} ${updatedApplication.last_name}`,
    decision: payload.decision === 'deny' ? 'denied' : 'approved',
    message: optionalMessage,
  });
} catch (emailError) {
  console.error('Failed to send decision email:', emailError);
  // Non-fatal; decision was made
}

return NextResponse.json({
  success: true,
  message: `Application ${payload.decision}ed successfully`,
  application: updatedApplication,
});
```

### 3. Add email sending to webhook completion (task 191 integration)

When webhook completes screening, consider sending optional notification:

Create `apps/web/lib/screening/email-notifications.ts`:

```typescript
import { sendEmail } from '@/lib/email/resend';

/**
 * Send screening complete notification to landlord (optional)
 */
export async function sendScreeningCompleteNotification(params: {
  landlordEmail: string;
  landlordName: string;
  applicantName: string;
  riskScore?: number;
}) {
  const html = `
    <html>
    <body style="font-family: Arial, sans-serif;">
      <p>Hi ${params.landlordName},</p>
      <p>The background check for ${params.applicantName} has completed.</p>
      ${params.riskScore ? `<p><strong>Risk Score:</strong> ${params.riskScore}/100</p>` : ''}
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/applications" style="background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Review Screening Report</a></p>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.landlordEmail,
    subject: `Screening Complete: ${params.applicantName}`,
    html,
  });
}
```

## Acceptance Criteria
1. [ ] Application submission (task 183) sends confirmation email to applicant
2. [ ] Confirmation email includes tracking ID and instructions
3. [ ] Application submission sends notification to landlord
4. [ ] Landlord notification includes applicant details and link to review
5. [ ] Decision API (task 186) sends decision notification to applicant
6. [ ] Decision notification customized for approval vs. denial
7. [ ] Optional message included in decision email
8. [ ] Email sending non-blocking (failures logged but don't prevent API success)
9. [ ] All emails branded with Liz colors and logo
10. [ ] Landlord notified when screening completes (optional, task 191)
11. [ ] Error logging for failed email sends
