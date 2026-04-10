---
id: 187
title: Public status API — GET /api/applications/status/[tracking-id]
tier: Sonnet
depends_on: [180, 182]
feature: P3-002-ai-tenant-screening
---

# 187 — Public status API — GET /api/applications/status/[tracking-id]

## Objective
Create a public (unauthenticated) API endpoint that allows applicants to check the status of their submitted application using a tracking ID. Returns a timeline of steps (submitted, under review, decision) and generic status messages without exposing AI screening details.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Public endpoint (no auth required). Accessed via `GET /api/applications/status/[tracking-id]`. Returns simplified status info safe for applicants to see.

## Implementation

### 1. Create API route

Create `apps/web/app/api/applications/status/[trackingId]/route.ts`:

```typescript
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
  { params }: { params: { trackingId: string } }
) {
  try {
    const { trackingId } = params;

    // Get application by tracking ID
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

    // Build status timeline
    const timeline = buildStatusTimeline(application.status, application.created_at, application.updated_at);

    // Build public response (no AI details)
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

/**
 * Build user-friendly status timeline
 */
function buildStatusTimeline(
  status: string,
  createdAt: string,
  updatedAt: string
): PublicApplicationStatusResponse['status_timeline'] {
  const timeline: PublicApplicationStatusResponse['status_timeline'] = [];

  // Step 1: Submitted
  timeline.push({
    step: 'submitted',
    completed: true,
    timestamp: createdAt,
  });

  // Step 2: Under review
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

  // Step 3: Decision
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

/**
 * Get generic decision message for applicant view
 */
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

/**
 * Get generic status message for applicant (no AI details)
 */
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
```

### 2. Add note on response type

The `PublicApplicationStatusResponse` is already defined in task 182. Verify it's exported:

```typescript
// From apps/web/lib/screening/types.ts
export interface PublicApplicationStatusResponse {
  tracking_id: string;
  status: ApplicationStatus;
  status_timeline: {
    step: 'submitted' | 'under_review' | 'decision';
    completed: boolean;
    timestamp?: string;
  }[];
  decision?: 'approved' | 'denied' | 'pending';
  message?: string;
}
```

### 3. Create client-side hook

Create `apps/web/lib/screening/hooks/usePublicApplicationStatus.ts`:

```typescript
import { useState, useCallback } from 'react';
import { PublicApplicationStatusResponse } from '../types';

export function usePublicApplicationStatus() {
  const [status, setStatus] = useState<PublicApplicationStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (trackingId: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/status/${trackingId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Application not found');
      }

      const data: PublicApplicationStatusResponse = await res.json();
      setStatus(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, error, fetchStatus };
}
```

## Acceptance Criteria
1. [ ] GET endpoint at `/api/applications/status/[trackingId]` works
2. [ ] Public endpoint (no auth required)
3. [ ] Looks up application by tracking_id
4. [ ] Returns 404 if tracking_id not found
5. [ ] Returns tracking_id in response
6. [ ] Returns status (submitted, screening, screened, approved, denied, withdrawn)
7. [ ] Builds timeline with three steps: submitted, under_review, decision
8. [ ] Timeline marks steps as completed based on current status
9. [ ] Timeline includes timestamps where applicable
10. [ ] Returns generic decision (approved/denied/pending, no AI details)
11. [ ] Returns user-friendly status message (no AI details)
12. [ ] No AI screening report data exposed in response
13. [ ] Client-side hook for applicant status page (task 198)
