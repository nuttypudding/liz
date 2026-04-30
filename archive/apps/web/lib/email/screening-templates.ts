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
      <h1>${isApproved ? '&#10003; Application Approved' : 'Application Decision'}</h1>
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
