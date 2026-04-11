---
id: 186
title: Application decision API — POST /api/applications/[id]/decide
tier: Sonnet
depends_on: [180, 182]
feature: P3-002-ai-tenant-screening
---

# 186 — Application decision API — POST /api/applications/[id]/decide

## Objective
Create an authenticated API endpoint for landlords to approve or deny applications. Validates decision logic (denial requires reason and compliance confirmation), updates application status, logs to audit trail, and triggers notification emails.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Landlord-only endpoint. Validates fair housing compliance (denial must confirm understanding). Records decision in audit log.

## Implementation

### 1. Create API route

Create `apps/web/app/api/applications/[id]/decide/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import {
  Application,
  ApplicationDecisionPayload,
  ApplicationStatus,
} from '@/lib/screening/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      .select('id')
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

    // Parse decision payload
    const payload: ApplicationDecisionPayload = await req.json();

    // Validate decision
    if (!['approve', 'deny', 'conditional'].includes(payload.decision)) {
      return NextResponse.json(
        { error: 'Invalid decision value' },
        { status: 400 }
      );
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
          {
            error: 'Must confirm understanding of fair housing compliance to deny an application',
          },
          { status: 400 }
        );
      }
    }

    // Map decision to status
    const statusMap: Record<string, ApplicationStatus> = {
      approve: ApplicationStatus.APPROVED,
      deny: ApplicationStatus.DENIED,
      conditional: ApplicationStatus.SCREENED, // stays as screened, awaiting further review
    };

    // Update application status
    const { data: updatedApplication, error: updateError } = await supabase
      .from('applications')
      .update({
        status: statusMap[payload.decision],
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      );
    }

    // Log decision to audit trail
    const { error: auditError } = await supabase
      .from('screening_audit_log')
      .insert([
        {
          application_id: params.id,
          action: 'decide',
          actor_id: userId,
          details: {
            decision: payload.decision,
            denial_reason: payload.denial_reason,
            message: payload.optional_message,
            compliance_confirmed: payload.compliance_confirmed,
          },
        },
      ]);

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Non-fatal, continue
    }

    // Send decision notification email (task 200)
    // This is wired by task 200; just log here for context

    const response: ApplicationDecisionResponse = {
      success: true,
      message: `Application ${payload.decision}ed successfully`,
      application: updatedApplication as Application,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Application decision error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Create decision validation utility

Update `apps/web/lib/screening/validation.ts`:

```typescript
import { ApplicationDecisionPayload } from './types';

export interface DecisionValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateApplicationDecision(
  payload: ApplicationDecisionPayload
): DecisionValidationResult {
  const errors: string[] = [];

  if (!payload.decision) {
    errors.push('decision is required');
  } else if (!['approve', 'deny', 'conditional'].includes(payload.decision)) {
    errors.push('Invalid decision (must be approve, deny, or conditional)');
  }

  if (payload.decision === 'deny') {
    if (!payload.denial_reason?.trim()) {
      errors.push('denial_reason is required for denial decisions');
    }
    if (!payload.compliance_confirmed) {
      errors.push(
        'Must confirm understanding of fair housing compliance to deny'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### 3. Create client-side mutation hook

Create `apps/web/lib/screening/hooks/useApplicationDecision.ts`:

```typescript
import { useState } from 'react';
import { Application, ApplicationDecisionPayload } from '../types';

export function useApplicationDecision() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (
    applicationId: string,
    payload: ApplicationDecisionPayload
  ): Promise<Application | null> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/${applicationId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to make decision');
      }

      const result = await res.json();
      return result.application;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { decide, loading, error };
}
```

## Acceptance Criteria
1. [ ] POST endpoint at `/api/applications/[id]/decide` works
2. [ ] Requires Clerk auth (401 if not authenticated)
3. [ ] Returns 404 if application not found
4. [ ] Returns 404 if landlord is not the owner
5. [ ] Validates decision (approve, deny, or conditional)
6. [ ] Requires denial_reason and compliance_confirmed for 'deny' decision
7. [ ] Returns 400 if denial validation fails
8. [ ] Updates application status: approve → approved, deny → denied, conditional → screened
9. [ ] Records decision in screening_audit_log with decision, reason, and compliance flag
10. [ ] Non-fatal audit log errors don't block response
11. [ ] Decision notification email triggered (task 200)
12. [ ] Response includes updated application
13. [ ] Client-side hook for UI (task 197)
