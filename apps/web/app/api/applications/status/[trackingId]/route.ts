import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ApplicationStatus, PublicApplicationStatusResponse } from '@/lib/screening/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/applications/status/[trackingId]
 * Public endpoint: allow applicants to check application status by tracking ID
 * No auth required. Returns status timeline and generic messages (no AI details).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;

    const { data: application, error: queryError } = await supabase
      .from('applications')
      .select('id, status, created_at, updated_at')
      .eq('tracking_id', trackingId)
      .single();

    if (queryError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const timeline = buildStatusTimeline(application.status, application.created_at, application.updated_at);

    const publicResponse: PublicApplicationStatusResponse = {
      tracking_id: trackingId,
      status: application.status as ApplicationStatus,
      status_timeline: timeline,
      decision: getDecisionForApplicant(application.status),
      message: getStatusMessageForApplicant(application.status),
    };

    return NextResponse.json(publicResponse);
  } catch (error) {
    console.error('Get application status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildStatusTimeline(
  status: string,
  createdAt: string,
  updatedAt: string
): PublicApplicationStatusResponse['status_timeline'] {
  const timeline: PublicApplicationStatusResponse['status_timeline'] = [];

  timeline.push({
    step: 'submitted',
    completed: true,
    timestamp: createdAt,
  });

  const underReviewCompleted = [
    ApplicationStatus.SCREENED,
    ApplicationStatus.APPROVED,
    ApplicationStatus.DENIED,
  ].includes(status as ApplicationStatus);

  timeline.push({
    step: 'under_review',
    completed: underReviewCompleted,
    timestamp: underReviewCompleted ? updatedAt : undefined,
  });

  const decisionCompleted = [
    ApplicationStatus.APPROVED,
    ApplicationStatus.DENIED,
  ].includes(status as ApplicationStatus);

  timeline.push({
    step: 'decision',
    completed: decisionCompleted,
    timestamp: decisionCompleted ? updatedAt : undefined,
  });

  return timeline;
}

function getDecisionForApplicant(
  status: string
): PublicApplicationStatusResponse['decision'] {
  switch (status) {
    case ApplicationStatus.APPROVED:
      return 'approved';
    case ApplicationStatus.DENIED:
      return 'denied';
    default:
      return 'pending';
  }
}

function getStatusMessageForApplicant(status: string): string {
  switch (status) {
    case ApplicationStatus.SUBMITTED:
      return 'Your application has been received. We will begin review shortly.';
    case ApplicationStatus.SCREENING:
      return 'Your application is currently under review. This process typically takes 3-5 business days.';
    case ApplicationStatus.SCREENED:
      return 'Your application has been screened and is awaiting a decision. You will be notified shortly.';
    case ApplicationStatus.APPROVED:
      return 'Congratulations! Your application has been approved. The landlord will contact you with next steps.';
    case ApplicationStatus.DENIED:
      return 'Unfortunately, your application has been denied. Please contact the landlord for more information.';
    case ApplicationStatus.WITHDRAWN:
      return 'This application has been withdrawn.';
    default:
      return 'Your application is pending review.';
  }
}
