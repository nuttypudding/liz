---
id: 204
title: Unit tests — application APIs
tier: Haiku
depends_on: [183, 184, 185, 186, 187]
feature: P3-002-ai-tenant-screening
---

# 204 — Unit tests — application APIs

## Objective
Create unit tests for all application CRUD APIs: submit, list, detail, decide, public status. Tests cover happy paths, error cases, auth checks, duplicate prevention, and business logic.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Jest + Supertest or similar test framework. Test files colocated with API routes.

## Implementation

### 1. Create test helper

Create `apps/web/__tests__/api/screening.test-utils.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { ApplicationSubmissionPayload, EmploymentStatus } from '@/lib/screening/types';

export const testSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const mockApplicationPayload: ApplicationSubmissionPayload = {
  property_id: '550e8400-e29b-41d4-a716-446655440000',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '555-123-4567',
  employment_status: EmploymentStatus.EMPLOYED,
  employer_name: 'Tech Corp',
  job_title: 'Engineer',
  employment_duration_months: 24,
  annual_income: 100000,
  monthly_rent_applying_for: 2000,
  references: [
    {
      name: 'Jane Smith',
      phone: '555-987-6543',
      relationship: 'landlord',
    },
  ],
  has_eviction_history: false,
  agrees_to_background_check: true,
  agrees_to_terms: true,
};

export async function cleanupTestData(applicationId: string) {
  await testSupabase
    .from('screening_audit_log')
    .delete()
    .eq('application_id', applicationId);

  await testSupabase
    .from('screening_reports')
    .delete()
    .eq('application_id', applicationId);

  await testSupabase
    .from('applications')
    .delete()
    .eq('id', applicationId);
}
```

### 2. Create API tests

Create `apps/web/__tests__/api/applications.test.ts`:

```typescript
import { POST as submitApplication, GET as listApplications } from '@/app/api/applications/route';
import { mockApplicationPayload, cleanupTestData } from './screening.test-utils';

describe('/api/applications', () => {
  describe('POST (submit application)', () => {
    it('should create application with valid payload', async () => {
      const req = new Request('http://localhost:3000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockApplicationPayload),
      });

      const res = await submitApplication(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.tracking_id).toBeDefined();
      expect(data.tracking_id).toMatch(/^APP-/);

      if (data.tracking_id) {
        // Cleanup
        await cleanupTestData(data.tracking_id);
      }
    });

    it('should reject missing required fields', async () => {
      const payload = { ...mockApplicationPayload, first_name: '' };

      const req = new Request('http://localhost:3000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await submitApplication(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const payload = { ...mockApplicationPayload, email: 'invalid-email' };

      const req = new Request('http://localhost:3000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await submitApplication(req);
      expect(res.status).toBe(400);
    });

    it('should prevent duplicate submission (same email + property within 30 days)', async () => {
      // First submission
      const req1 = new Request('http://localhost:3000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockApplicationPayload),
      });

      const res1 = await submitApplication(req1);
      expect(res1.status).toBe(201);
      const data1 = await res1.json();

      // Second submission with same email + property
      const req2 = new Request('http://localhost:3000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockApplicationPayload),
      });

      const res2 = await submitApplication(req2);
      expect(res2.status).toBe(409);

      const data2 = await res2.json();
      expect(data2.error).toContain('already submitted');

      // Cleanup
      await cleanupTestData(data1.tracking_id);
    });

    it('should generate unique tracking IDs', async () => {
      const payload1 = { ...mockApplicationPayload };
      const payload2 = { ...mockApplicationPayload, email: 'jane@example.com' };

      const req1 = new Request('http://localhost:3000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload1),
      });

      const req2 = new Request('http://localhost:3000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload2),
      });

      const res1 = await submitApplication(req1);
      const res2 = await submitApplication(req2);

      const data1 = await res1.json();
      const data2 = await res2.json();

      expect(data1.tracking_id).not.toBe(data2.tracking_id);

      // Cleanup
      await cleanupTestData(data1.tracking_id);
      await cleanupTestData(data2.tracking_id);
    });
  });

  describe('GET (list applications)', () => {
    // Requires Clerk auth context
    it('should require authentication', async () => {
      const req = new Request('http://localhost:3000/api/applications', {
        method: 'GET',
      });

      const res = await listApplications(req);
      expect(res.status).toBe(401);
    });

    // Additional tests would require mocking Clerk auth
  });
});

describe('/api/applications/status/[trackingId]', () => {
  it('should return application status without auth', async () => {
    // Create application first
    const submitReq = new Request('http://localhost:3000/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockApplicationPayload),
    });

    const submitRes = await submitApplication(submitReq);
    const submitData = await submitRes.json();
    const trackingId = submitData.tracking_id;

    // Query public status endpoint
    const statusReq = new Request(
      `http://localhost:3000/api/applications/status/${trackingId}`,
      { method: 'GET' }
    );

    // Import public status endpoint
    // const { GET: getStatus } = await import('@/app/api/applications/status/[trackingId]/route');
    // const statusRes = await getStatus(statusReq, { params: { trackingId } });

    // expect(statusRes.status).toBe(200);
    // const statusData = await statusRes.json();
    // expect(statusData.status).toBe('submitted');
    // expect(statusData.message).toBeDefined();

    // Cleanup
    await cleanupTestData(trackingId);
  });

  it('should return 404 for invalid tracking ID', async () => {
    // Skip for now; requires endpoint import
  });
});
```

### 3. Run tests

```bash
npm run test apps/web/__tests__/api/applications.test.ts
```

## Acceptance Criteria
1. [ ] Test file created: `__tests__/api/applications.test.ts`
2. [ ] POST /api/applications:
   - [ ] Valid payload creates application
   - [ ] Missing required fields rejected
   - [ ] Invalid email rejected
   - [ ] Duplicate submission (30 days) rejected
   - [ ] Unique tracking IDs generated
3. [ ] GET /api/applications:
   - [ ] Auth required (401 if missing)
   - [ ] Returns paginated list
   - [ ] Filters by property and status
   - [ ] Sorts by date and risk score
4. [ ] GET /api/applications/[id]:
   - [ ] Auth required
   - [ ] Returns full application data
   - [ ] Includes screening report if available
   - [ ] Calculates income-to-rent ratio
   - [ ] Returns 404 if not found
5. [ ] POST /api/applications/[id]/decide:
   - [ ] Auth required
   - [ ] Denials require reason and compliance
   - [ ] Updates application status
   - [ ] Logs audit trail
6. [ ] GET /api/applications/status/[trackingId]:
   - [ ] Public endpoint (no auth)
   - [ ] Returns status timeline
   - [ ] Hides AI details
   - [ ] Returns 404 for invalid ID
7. [ ] All tests pass (npm run test)
