import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ApplicationStatus, ApplicationSubmissionPayload } from '@/lib/screening/types';
import { generateTrackingId } from '@/lib/screening/utils';
import { validateApplicationPayload } from '@/lib/screening/validation';

/**
 * POST /api/applications
 * Public endpoint: accept application submission from applicant (no auth required)
 */
export async function POST(req: NextRequest) {
  try {
    const payload: ApplicationSubmissionPayload = await req.json();

    const validation = validateApplicationPayload(payload);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { property_id, email, monthly_rent_applying_for } = payload;

    const supabase = createServerSupabaseClient();

    // Check for duplicate submission (same email + property within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: existingApp, error: queryError } = await supabase
      .from('applications')
      .select('id')
      .eq('property_id', property_id)
      .eq('email', email)
      .gte('created_at', thirtyDaysAgo)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      console.error('Duplicate check query error:', queryError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (existingApp) {
      return NextResponse.json(
        { error: 'Application already submitted for this property in the last 30 days' },
        { status: 409 }
      );
    }

    const tracking_id = generateTrackingId();

    const { data: application, error: insertError } = await supabase
      .from('applications')
      .insert([
        {
          property_id,
          landlord_id: null,
          first_name: payload.first_name,
          last_name: payload.last_name,
          email,
          phone: payload.phone,
          date_of_birth: payload.date_of_birth,
          employment_status: payload.employment_status,
          employer_name: payload.employer_name,
          job_title: payload.job_title,
          employment_duration_months: payload.employment_duration_months,
          annual_income: payload.annual_income,
          monthly_rent_applying_for,
          references: payload.references || [],
          has_eviction_history: payload.has_eviction_history,
          eviction_details: payload.eviction_details,
          status: ApplicationStatus.SUBMITTED,
          tracking_id,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        tracking_id: application.tracking_id,
        message: 'Application submitted successfully. Check your status using the tracking ID.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
