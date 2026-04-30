import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/applications/[id]/screen/status
 * Poll screening status (for client-side waiting UI)
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

    const { data: profile } = await supabase
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    const { data: application } = await supabase
      .from('applications')
      .select('id, status, risk_score, updated_at')
      .eq('id', id)
      .eq('landlord_id', profile.id)
      .single();

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { data: report } = await supabase
      .from('screening_reports')
      .select('id, status, risk_score, recommendation')
      .eq('application_id', id)
      .single();

    return NextResponse.json({
      success: true,
      application_status: application.status,
      application_risk_score: application.risk_score,
      screening_status: report?.status || null,
      screening_risk_score: report?.risk_score,
      screening_recommendation: report?.recommendation,
      updated_at: application.updated_at,
    });
  } catch (error) {
    console.error('Screening status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
