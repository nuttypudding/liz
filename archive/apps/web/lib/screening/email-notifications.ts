import { sendEmail } from '@/lib/email/resend';

/**
 * Send screening complete notification to landlord (optional, non-blocking).
 */
export async function sendScreeningCompleteNotification(params: {
  landlordEmail: string;
  landlordName: string;
  applicantName: string;
  riskScore?: number;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const html = `
    <html>
    <body style="font-family: Arial, sans-serif; color: #111827; padding: 24px;">
      <p>Hi ${params.landlordName},</p>
      <p>The background check for <strong>${params.applicantName}</strong> has completed.</p>
      ${params.riskScore !== undefined ? `<p><strong>Risk Score:</strong> ${params.riskScore}/100</p>` : ''}
      <p>
        <a href="${appUrl}/applications" style="background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Review Screening Report
        </a>
      </p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">Liz AI Property Manager</p>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.landlordEmail,
    subject: `Screening Complete: ${params.applicantName}`,
    html,
  });
}
