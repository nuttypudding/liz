---
id: 192
title: Screening orchestrator — POST /api/applications/[id]/screen
tier: Sonnet
depends_on: [189, 190]
feature: P3-002-ai-tenant-screening
---

# 192 — Screening orchestrator — POST /api/applications/[id]/screen

## Objective
Create an orchestrator endpoint that landlords use to initiate screening. Coordinates:
1. Background check ordering (via provider interface)
2. Application status update to 'screening'
3. Audit logging
4. Webhook-based result handling for final AI analysis

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Landlord-initiated action. Triggers background check order, returns status polling info, and sets up async completion via webhook (task 191).

## Implementation

### 1. Create orchestrator endpoint

Create `apps/web/app/api/applications/[id]/screen/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { getScreeningProvider } from '@/lib/screening/providers/factory';
import { ApplicationStatus } from '@/lib/screening/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      .select('id, screening_provider')
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

    // Check if already screened
    if (
      application.status === ApplicationStatus.APPROVED ||
      application.status === ApplicationStatus.DENIED
    ) {
      return NextResponse.json(
        { error: 'Cannot re-screen already decided application' },
        { status: 409 }
      );
    }

    // Check if already screening
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

    // Initialize screening provider
    const provider = getScreeningProvider(profile.screening_provider || 'smartmove');

    // Create background check order
    const orderResult = await provider.createOrder({
      application_id: params.id,
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

    // Update application status to 'screening'
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        status: ApplicationStatus.SCREENING,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Failed to update application status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update application status' },
        { status: 500 }
      );
    }

    // Create screening_report record (status: pending)
    const { data: report, error: reportError } = await supabase
      .from('screening_reports')
      .insert([
        {
          application_id: params.id,
          provider: profile.screening_provider || 'smartmove',
          external_order_id: orderResult.external_order_id,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (reportError) {
      console.error('Failed to create screening report record:', reportError);
      // Non-fatal; order was created, report creation failed
    }

    // Log screening initiation
    const { error: auditError } = await supabase
      .from('screening_audit_log')
      .insert([
        {
          application_id: params.id,
          action: 'screen',
          actor_id: userId,
          details: {
            provider: profile.screening_provider,
            external_order_id: orderResult.external_order_id,
          },
        },
      ]);

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Non-fatal
    }

    const response: ScreeningInitiationResponse = {
      success: true,
      message: 'Screening order created. Results will be available shortly.',
      screening_id: report?.id || params.id,
      status: ApplicationStatus.SCREENING,
      polling_interval_ms: 5000, // Client should poll every 5 seconds
    };

    return NextResponse.json(response, { status: 202 }); // 202 Accepted (async operation)
  } catch (error) {
    console.error('Screening orchestration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Create polling status endpoint

Create `apps/web/app/api/applications/[id]/screen/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/applications/[id]/screen/status
 * Poll screening status (for client-side waiting UI)
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
    const { data: profile } = await supabase
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Landlord profile not found' },
        { status: 404 }
      );
    }

    // Get application status
    const { data: application } = await supabase
      .from('applications')
      .select('id, status, risk_score, updated_at')
      .eq('id', params.id)
      .eq('landlord_id', profile.id)
      .single();

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Get screening report if exists
    const { data: report } = await supabase
      .from('screening_reports')
      .select('id, status, risk_score, recommendation')
      .eq('application_id', params.id)
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3. Create client-side hook for screening initiation

Create `apps/web/lib/screening/hooks/useScreeningOrchestrator.ts`:

```typescript
import { useState, useCallback } from 'react';

export interface ScreeningStatus {
  application_status: string;
  application_risk_score?: number;
  screening_status?: string;
  screening_risk_score?: number;
  screening_recommendation?: string;
  updated_at: string;
}

export function useScreeningOrchestrator() {
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ScreeningStatus | null>(null);

  const initiateScreening = useCallback(
    async (applicationId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/applications/${applicationId}/screen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to initiate screening');
        }

        const data = await res.json();
        setStatus({
          application_status: data.status,
          updated_at: new Date().toISOString(),
        });

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const pollScreeningStatus = useCallback(
    async (applicationId: string): Promise<ScreeningStatus | null> => {
      try {
        const res = await fetch(`/api/applications/${applicationId}/screen/status`);
        if (!res.ok) {
          throw new Error('Failed to fetch screening status');
        }

        const data: { success: boolean } & ScreeningStatus = await res.json();
        setStatus(data);
        return data;
      } catch (err) {
        console.error('Polling error:', err);
        return null;
      }
    },
    []
  );

  const startPolling = useCallback(
    async (applicationId: string, intervalMs = 5000) => {
      setPolling(true);

      const pollInterval = setInterval(async () => {
        const result = await pollScreeningStatus(applicationId);
        if (result && result.screening_status === 'completed') {
          clearInterval(pollInterval);
          setPolling(false);
        }
      }, intervalMs);

      return pollInterval;
    },
    [pollScreeningStatus]
  );

  return {
    initiateScreening,
    pollScreeningStatus,
    startPolling,
    loading,
    polling,
    error,
    status,
  };
}
```

## Acceptance Criteria
1. [ ] POST endpoint at `/api/applications/[id]/screen` works
2. [ ] Requires Clerk auth (401 if not authenticated)
3. [ ] Returns 404 if application not found
4. [ ] Returns 404 if landlord is not the owner
5. [ ] Returns 409 if application already approved/denied
6. [ ] Gets landlord's screening_provider preference (default: smartmove)
7. [ ] Calls provider.createOrder() with applicant data
8. [ ] Creates screening_reports record with status='pending'
9. [ ] Updates application status to 'screening'
10. [ ] Logs screening initiation to audit_log
11. [ ] Returns 202 (Accepted) with polling_interval_ms
12. [ ] GET status endpoint at `/api/applications/[id]/screen/status` works
13. [ ] Status endpoint returns application_status, screening_status, risk scores
14. [ ] Client-side hook supports initiate and poll operations
15. [ ] Webhook handler (task 191) completes screening when background check done
