import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ApplicationStatus, ApplicationSubmissionPayload } from '@/lib/screening/types';
import { generateTrackingId } from '@/lib/screening/utils';
import { validateApplicationPayload } from '@/lib/screening/validation';

const VALID_SORT_FIELDS = ['created_at', 'risk_score', 'updated_at', 'email'] as const;
const VALID_ORDERS = ['asc', 'desc'] as const;

/**
 * GET /api/applications?property_id=<uuid>&status=<status>&sort=<field>&order=<asc|desc>&page=<n>&limit=<n>
 * Landlord-only: list applications for landlord's properties
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { data: profile, error: profileError } = await supabase
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const property_id = searchParams.get('property_id');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    if (page < 1) {
      return NextResponse.json({ error: 'page must be >= 1' }, { status: 400 });
    }

    if (!VALID_SORT_FIELDS.includes(sort as typeof VALID_SORT_FIELDS[number]) ||
        !VALID_ORDERS.includes(order as typeof VALID_ORDERS[number])) {
      return NextResponse.json({ error: 'Invalid sort or order parameter' }, { status: 400 });
    }

    let query = supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .eq('landlord_id', profile.id);

    if (property_id) query = query.eq('property_id', property_id);
    if (status) query = query.eq('status', status);

    const ascending = order === 'asc';
    query = sort === 'risk_score'
      ? query.order(sort, { ascending, nullsFirst: false })
      : query.order(sort, { ascending });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: applications, error: queryError, count } = await query;

    if (queryError) {
      console.error('Query error:', queryError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error('List applications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
