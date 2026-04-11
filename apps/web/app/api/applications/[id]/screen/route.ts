import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getScreeningProvider } from '@/lib/screening/providers/factory';
import { ApplicationStatus } from '@/lib/screening/types';

export interface ScreeningInitiationResponse {
  success: boolean;
  message: string;
  screening_id?: string;
  status?: string;
  polling_interval_ms?: number;
  error?: string;
}

/**
 * POST /api/applications/[id]/screen
 * Landlord-initiated: start background check screening
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

    const { data: profile, error: profileError } = await supabase
      .from('landlord_profiles')
      .select('id, screening_provider')
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

    if (
      application.status === ApplicationStatus.APPROVED ||
      application.status === ApplicationStatus.DENIED
    ) {
      return NextResponse.json(
        { error: 'Cannot re-screen already decided application' },
        { status: 409 }
      );
    }

    if (application.status === ApplicationStatus.SCREENING) {
      return NextResponse.json(
        {
          error: 'Screening already in progress',
          screening_id: application.id,
          status: ApplicationStatus.SCREENING,
          polling_interval_ms: 5000,
        },
        { status: 202 }
      );
    }

    const providerName = profile.screening_provider || 'smartmove';
    const provider = getScreeningProvider(providerName);

    const orderResult = await provider.createOrder({
      application_id: id,
      first_name: application.first_name,
      last_name: application.last_name,
      email: application.email,
      phone: application.phone,
      date_of_birth: application.date_of_birth,
    });

    if (!orderResult.success) {
      return NextResponse.json(
        { error: `Failed to create screening order: ${orderResult.error}` },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from('applications')
      .update({ status: ApplicationStatus.SCREENING, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update application status:', updateError);
      return NextResponse.json({ error: 'Failed to update application status' }, { status: 500 });
    }

    const { data: report, error: reportError } = await supabase
      .from('screening_reports')
      .insert([{
        application_id: id,
        provider: providerName,
        external_order_id: orderResult.external_order_id,
        status: 'pending',
      }])
      .select()
      .single();

    if (reportError) {
      console.error('Failed to create screening report record:', reportError);
    }

    supabase.from('screening_audit_log').insert([{
      application_id: id,
      action: 'screen',
      actor_id: userId,
      details: { provider: providerName, external_order_id: orderResult.external_order_id },
    }]).then(({ error }) => {
      if (error) console.error('Audit log error:', error);
    });

    const response: ScreeningInitiationResponse = {
      success: true,
      message: 'Screening order created. Results will be available shortly.',
      screening_id: report?.id || id,
      status: ApplicationStatus.SCREENING,
      polling_interval_ms: 5000,
    };

    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    console.error('Screening orchestration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
