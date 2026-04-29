import { sendEmail } from './resend';
import {
  applicationConfirmationEmail,
  landlordNewApplicationEmail,
  applicantDecisionEmail,
} from './screening-templates';

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
