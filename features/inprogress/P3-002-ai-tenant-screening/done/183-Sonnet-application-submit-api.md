---
id: 183
title: Application submission API — POST /api/applications (public)
tier: Sonnet
depends_on: [180, 182]
feature: P3-002-ai-tenant-screening
---

# 183 — Application submission API — POST /api/applications (public)

## Objective
Create a public API endpoint for tenants to submit applications for properties. The endpoint accepts applicant data, validates it, generates a unique tracking ID, creates the application record, and prevents duplicate submissions (same email + property within 30 days).

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

This is a public endpoint (no authentication required). Applicants access via the portal (task 194). Returns a 201 with tracking ID for status lookup.

## Implementation

### 1. Create API route

Create `apps/web/app/api/applications/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  Application,
  ApplicationStatus,
  ApplicationSubmissionPayload,
} from '@/lib/screening/types';
import { generateTrackingId } from '@/lib/screening/utils'; // Implement: random alphanumeric, e.g., APP-XXXXX
import { validateApplicationPayload } from '@/lib/screening/validation'; // Implement in task 183

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for public writes
);

/**
 * POST /api/applications
 * Public endpoint: accept application submission from applicant
 */
export async function POST(req: NextRequest) {
  try {
    const payload: ApplicationSubmissionPayload = await req.json();

    // Validate payload
    const validation = validateApplicationPayload(payload);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { property_id, email, monthly_rent_applying_for } = payload;

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
      // PGRST116 = no rows, which is expected
      console.error('Duplicate check query error:', queryError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (existingApp) {
      return NextResponse.json(
        { error: 'Application already submitted for this property in the last 30 days' },
        { status: 409 }
      );
    }

    // Generate unique tracking ID
    const tracking_id = generateTrackingId();

    // Create application record
    const { data: application, error: insertError } = await supabase
      .from('applications')
      .insert([
        {
          property_id,
          landlord_id: null, // Set by join to property; handled by trigger or query
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
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      );
    }

    // Send confirmation email to applicant (task 200)
    // Notify landlord of new application (task 200)

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Create validation utility

Create `apps/web/lib/screening/validation.ts`:

```typescript
import { ApplicationSubmissionPayload, EmploymentStatus } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateApplicationPayload(
  payload: ApplicationSubmissionPayload
): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!payload.property_id?.trim()) errors.push('property_id is required');
  if (!payload.first_name?.trim()) errors.push('first_name is required');
  if (!payload.last_name?.trim()) errors.push('last_name is required');
  if (!payload.email?.trim()) errors.push('email is required');
  if (!isValidEmail(payload.email)) errors.push('Invalid email format');
  if (!payload.employment_status) errors.push('employment_status is required');
  if (!Object.values(EmploymentStatus).includes(payload.employment_status)) {
    errors.push('Invalid employment_status');
  }
  if (!payload.monthly_rent_applying_for || payload.monthly_rent_applying_for <= 0) {
    errors.push('monthly_rent_applying_for is required and must be > 0');
  }

  // Optional but validated if present
  if (payload.phone && !isValidPhone(payload.phone)) {
    errors.push('Invalid phone format');
  }

  if (payload.date_of_birth && !isValidDate(payload.date_of_birth)) {
    errors.push('Invalid date_of_birth format (expected YYYY-MM-DD)');
  }

  if (payload.annual_income !== undefined && payload.annual_income < 0) {
    errors.push('annual_income must be >= 0');
  }

  if (payload.references) {
    if (!Array.isArray(payload.references)) {
      errors.push('references must be an array');
    } else {
      payload.references.forEach((ref, i) => {
        if (!ref.name?.trim()) errors.push(`references[${i}].name is required`);
        if (!ref.relationship?.trim()) errors.push(`references[${i}].relationship is required`);
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidPhone(phone: string): boolean {
  const re = /^[\d\s\-\+\(\)]+$/;
  return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function isValidDate(dateString: string): boolean {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
```

### 3. Create tracking ID utility

Create or update `apps/web/lib/screening/utils.ts`:

```typescript
import crypto from 'crypto';

/**
 * Generate unique tracking ID for application status lookup
 * Format: APP-XXXXX (e.g., APP-A7K9M)
 */
export function generateTrackingId(): string {
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `APP-${randomPart}`;
}
```

## Acceptance Criteria
1. [ ] Endpoint accepts POST requests at `/api/applications`
2. [ ] Validates all required fields (first_name, last_name, email, employment_status, monthly_rent_applying_for)
3. [ ] Returns 400 with validation errors if payload invalid
4. [ ] Checks for duplicate submissions (same email + property within 30 days)
5. [ ] Returns 409 if duplicate detected
6. [ ] Generates unique tracking_id (APP-XXXXX format)
7. [ ] Creates application record with status = 'submitted'
8. [ ] Returns 201 with tracking_id in response
9. [ ] Public endpoint (no auth required)
10. [ ] Service role key used for DB writes (not user auth)
11. [ ] Error handling: 500 for database errors
12. [ ] Validation utility tested with edge cases (invalid email, negative income, etc.)
13. [ ] Email notifications wired (tasks 199–200)
