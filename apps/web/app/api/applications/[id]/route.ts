import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Application, ScreeningReport, ApplicationDetailResponse } from '@/lib/screening/types';
import { AuditLogger } from '@/lib/screening/audit-log';

/**
 * GET /api/applications/[id]
 * Landlord-only: retrieve full application with screening report if available
 */
export async function GET(
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

    const { data: profile, error: profileError } = await supabase
      .from('landlord_profiles')
      .select('id, min_income_ratio')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .eq('landlord_id', profile.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { data: screening_report } = await supabase
      .from('screening_reports')
      .select('*')
      .eq('application_id', id)
      .single();

    const computed_metrics: ApplicationDetailResponse['data']['computed_metrics'] = {};

    if (application.annual_income && application.monthly_rent_applying_for) {
      computed_metrics.income_to_rent_ratio =
        application.annual_income / (application.monthly_rent_applying_for * 12);
      computed_metrics.meets_min_ratio =
        computed_metrics.income_to_rent_ratio >= profile.min_income_ratio;
    }

    // Log view action to audit trail (non-fatal)
    await AuditLogger.logView(id, userId);

    const response: ApplicationDetailResponse = {
      success: true,
      data: {
        application: application as Application,
        screening_report: (screening_report as ScreeningReport) || undefined,
        computed_metrics,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get application detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
