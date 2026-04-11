import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  try {
    const result = await getResend().emails.send({
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
