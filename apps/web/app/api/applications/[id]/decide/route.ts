import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  Application,
  ApplicationDecisionPayload,
  ApplicationStatus,
} from '@/lib/screening/types';
import { AuditLogger } from '@/lib/screening/audit-log';
import { sendApplicantDecisionNotification } from '@/lib/email/screening-service';

export interface ApplicationDecisionResponse {
  success: boolean;
  message: string;
  application: Application;
}

/**
 * POST /api/applications/[id]/decide
 * Landlord-only: make an approval or denial decision
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Get landlord_id
    const { data: profile, error: profileError } = await supabase
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Landlord profile not found' },
        { status: 404 }
      );
    }

    // Get application (verify ownership)
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .eq('landlord_id', profile.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Parse decision payload
    const payload: ApplicationDecisionPayload = await req.json();

    // Validate decision
    if (!['approve', 'deny', 'conditional'].includes(payload.decision)) {
      return NextResponse.json({ error: 'Invalid decision value' }, { status: 400 });
    }

    // If deny, require reason and compliance confirmation
    if (payload.decision === 'deny') {
      if (!payload.denial_reason?.trim()) {
        return NextResponse.json(
          { error: 'denial_reason is required for denial' },
          { status: 400 }
        );
      }
      if (!payload.compliance_confirmed) {
        return NextResponse.json(
          { error: 'Must confirm understanding of fair housing compliance to deny an application' },
          { status: 400 }
        );
      }
    }

    // Map decision to status
    const statusMap: Record<string, ApplicationStatus> = {
      approve: ApplicationStatus.APPROVED,
      deny: ApplicationStatus.DENIED,
      conditional: ApplicationStatus.SCREENED,
    };

    // Update application status
    const { data: updatedApplication, error: updateError } = await supabase
      .from('applications')
      .update({
        status: statusMap[payload.decision],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // Log decision to audit trail (non-fatal)
    await AuditLogger.logDecision(
      id,
      userId,
      payload.decision as 'approve' | 'deny' | 'conditional',
      payload.denial_reason
    );

    // Send decision notification email to applicant (non-fatal)
    try {
      const decision = payload.decision === 'approve' ? 'approved' : 'denied';
      await sendApplicantDecisionNotification({
        applicantEmail: updatedApplication.email,
        applicantName: `${updatedApplication.first_name} ${updatedApplication.last_name}`,
        decision,
        message: payload.optional_message,
      });
    } catch (emailError) {
      console.error('Failed to send decision email:', emailError);
    }

    const response: ApplicationDecisionResponse = {
      success: true,
      message: `Application ${payload.decision}ed successfully`,
      application: updatedApplication as Application,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Application decision error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
