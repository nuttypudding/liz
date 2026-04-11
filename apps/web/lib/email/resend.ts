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
