---
id: 185
title: Application detail API — GET /api/applications/[id]
tier: Sonnet
depends_on: [180, 182]
feature: P3-002-ai-tenant-screening
---

# 185 — Application detail API — GET /api/applications/[id]

## Objective
Create an authenticated API endpoint for landlords to retrieve the full details of a single application, including applicant information, optional screening report, and computed income-to-rent ratio. Only accessible to the landlord who owns the property.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Landlord-only endpoint (requires Clerk auth). Returns full application with optional screening report and computed metrics.

## Implementation

### 1. Create API route

Create `apps/web/app/api/applications/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Application, ScreeningReport } from '@/lib/screening/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ApplicationDetailResponse {
  success: boolean;
  data: {
    application: Application;
    screening_report?: ScreeningReport;
    computed_metrics: {
      income_to_rent_ratio?: number; // annual_income / (monthly_rent_applying_for * 12)
      meets_min_ratio?: boolean; // Check against landlord's preference
    };
  };
}

/**
 * GET /api/applications/[id]
 * Landlord-only: retrieve full application with screening report if available
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get landlord_id
    const { data: profile, error: profileError } = await supabase
      .from('landlord_profiles')
      .select('id, min_income_ratio')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Landlord profile not found' },
        { status: 404 }
      );
    }

    const landlord_id = profile.id;

    // Get application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', params.id)
      .eq('landlord_id', landlord_id)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Get screening report if exists
    const { data: screening_report } = await supabase
      .from('screening_reports')
      .select('*')
      .eq('application_id', params.id)
      .single();

    // Compute metrics
    const computed_metrics = {
      income_to_rent_ratio: undefined as number | undefined,
      meets_min_ratio: undefined as boolean | undefined,
    };

    if (application.annual_income && application.monthly_rent_applying_for) {
      computed_metrics.income_to_rent_ratio =
        application.annual_income / (application.monthly_rent_applying_for * 12);
      computed_metrics.meets_min_ratio =
        computed_metrics.income_to_rent_ratio >= profile.min_income_ratio;
    }

    // Log view action to audit trail (task 203)
    await supabase.from('screening_audit_log').insert([
      {
        application_id: params.id,
        action: 'view',
        actor_id: userId,
        details: { ip: req.headers.get('x-forwarded-for') },
      },
    ]).then(({ error }) => {
      if (error) console.error('Audit log error:', error);
    });

    const response: ApplicationDetailResponse = {
      success: true,
      data: {
        application: application as Application,
        screening_report: screening_report || undefined,
        computed_metrics,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get application detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Add response interface

Update `apps/web/lib/screening/types.ts`:

```typescript
export interface ApplicationDetailResponse {
  success: boolean;
  data: {
    application: Application;
    screening_report?: ScreeningReport;
    computed_metrics: {
      income_to_rent_ratio?: number;
      meets_min_ratio?: boolean;
    };
  };
}
```

### 3. Create client-side hook

Create `apps/web/lib/screening/hooks/useApplicationDetail.ts`:

```typescript
import { useState, useCallback, useEffect } from 'react';
import { ApplicationDetailResponse } from '../types';

export function useApplicationDetail(applicationId: string | null) {
  const [data, setData] = useState<ApplicationDetailResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!applicationId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch application');
      }

      const result: ApplicationDetailResponse = await res.json();
      setData(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (applicationId) {
      fetchDetail();
    }
  }, [applicationId, fetchDetail]);

  return { data, loading, error, refetch: fetchDetail };
}
```

## Acceptance Criteria
1. [ ] GET endpoint at `/api/applications/[id]` works
2. [ ] Requires Clerk auth (401 if not authenticated)
3. [ ] Returns 404 if application not found
4. [ ] Returns 404 if landlord is not the owner
5. [ ] Returns full application data
6. [ ] Joins and returns screening_report if available (undefined otherwise)
7. [ ] Computes income-to-rent ratio (annual_income / (monthly_rent_applying_for * 12))
8. [ ] Compares ratio against landlord's min_income_ratio preference
9. [ ] Records 'view' action in screening_audit_log
10. [ ] Response type: ApplicationDetailResponse
11. [ ] Client-side hook created for UI consumption (task 196)
