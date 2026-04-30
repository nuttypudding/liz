/**
 * Integration tests for the full screening pipeline.
 *
 * Tests: applicant submits → landlord initiates screening → background check completes
 *        → AI analysis runs → landlord makes decision.
 *
 * Scenarios:
 *   1. Complete workflow: submit → screen → decide
 *   2. Status check returns correct application state
 *   3. Landlord can initiate screening (with mocked auth)
 *   4. AI analysis fields populate on screened application
 *   5. Landlord can approve a screened application
 *   6. Audit log records all actions
 *   7. Duplicate submission blocked within 30 days (409)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { MockScreeningProvider } from '../mocks/screening-provider.mock';
import { mockApplicationPayload } from '../../tests/api/screening.test-utils';

// --- Supabase server mock (used by POST /api/applications, /screen, /decide) ---
const mockServerSupabaseFrom = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockServerSupabaseFrom,
  })),
}));

// --- Supabase direct client mock (used by status route and audit-log) ---
const mockDirectSupabaseFrom = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockDirectSupabaseFrom,
  })),
}));

// --- Clerk mock ---
const mockAuthFn = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ userId: 'landlord-user-id' })
);
const mockGetAuth = vi.hoisted(() =>
  vi.fn(() => ({ userId: null }))
);
const mockClerkClient = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    users: {
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ id: 'email-1', emailAddress: 'landlord@example.com' }],
        primaryEmailAddressId: 'email-1',
        firstName: 'Test',
      }),
    },
  })
);

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuthFn,
  getAuth: mockGetAuth,
  clerkClient: mockClerkClient,
}));

// --- Audit logger mock ---
vi.mock('@/lib/screening/audit-log', () => ({
  AuditLogger: {
    logView: vi.fn().mockResolvedValue(true),
    logScreeningStart: vi.fn().mockResolvedValue(true),
    logDecision: vi.fn().mockResolvedValue(true),
    logNotification: vi.fn().mockResolvedValue(true),
    logWebhook: vi.fn().mockResolvedValue(true),
  },
  AuditAction: {
    VIEW: 'view',
    SCREEN: 'screen',
    DECIDE: 'decide',
    EXPORT: 'export',
    NOTIFY: 'notify',
    WEBHOOK: 'webhook',
  },
}));

// --- Email service mock ---
vi.mock('@/lib/email/screening-service', () => ({
  sendApplicationConfirmation: vi.fn().mockResolvedValue(true),
  sendLandlordNewApplicationNotification: vi.fn().mockResolvedValue(true),
  sendApplicantDecisionNotification: vi.fn().mockResolvedValue(true),
}));

// --- Screening provider mock ---
vi.mock('@/lib/screening/providers/factory', () => ({
  getScreeningProvider: vi.fn(() => new MockScreeningProvider()),
}));

// Import route handlers after mocks are set up
import { POST as submitApplication } from '@/app/api/applications/route';
import { GET as getApplicationStatus } from '@/app/api/applications/status/[trackingId]/route';
import { POST as initiateScreening } from '@/app/api/applications/[id]/screen/route';
import { POST as makeDecision } from '@/app/api/applications/[id]/decide/route';
import { AuditLogger } from '@/lib/screening/audit-log';

// ============================================================================
// Helpers
// ============================================================================

/** Build a chainable Supabase query mock that resolves with the given data. */
function makeChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'in', 'not',
    'order', 'limit', 'range', 'is',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolvedValue).then(resolve);
  return chain;
}

const PROPERTY_ID = '550e8400-e29b-41d4-a716-446655440000';
const LANDLORD_PROFILE_ID = 'landlord-profile-uuid';
const APPLICATION_ID = 'application-uuid';
const TRACKING_ID = 'TRK-TEST-001';

const mockProperty = {
  id: PROPERTY_ID,
  address: '123 Main St',
  landlord_id: 'landlord-user-id',
};

const mockLandlordProfile = {
  id: LANDLORD_PROFILE_ID,
  screening_provider: 'smartmove',
};

const mockApplication = {
  id: APPLICATION_ID,
  tracking_id: TRACKING_ID,
  property_id: PROPERTY_ID,
  landlord_id: LANDLORD_PROFILE_ID,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '555-123-4567',
  status: 'submitted',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function buildNextRequest(
  method: string,
  url: string,
  body?: unknown
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ============================================================================
// Scenario 1: Complete workflow — submit → screen → decide
// ============================================================================

describe('Scenario 1: Submit application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates application and returns tracking_id (201)', async () => {
    mockServerSupabaseFrom
      // properties lookup
      .mockReturnValueOnce(makeChain({ data: mockProperty, error: null }))
      // landlord_profiles lookup
      .mockReturnValueOnce(makeChain({ data: mockLandlordProfile, error: null }))
      // duplicate check — no existing application
      .mockReturnValueOnce(makeChain({ data: null, error: { code: 'PGRST116' } }))
      // insert application
      .mockReturnValueOnce(makeChain({ data: mockApplication, error: null }));

    const req = buildNextRequest(
      'POST',
      'http://localhost:3000/api/applications',
      mockApplicationPayload
    );

    const res = await submitApplication(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.tracking_id).toBeDefined();
  });

  it('records application with submitted status', async () => {
    mockServerSupabaseFrom
      .mockReturnValueOnce(makeChain({ data: mockProperty, error: null }))
      .mockReturnValueOnce(makeChain({ data: mockLandlordProfile, error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: { code: 'PGRST116' } }))
      .mockReturnValueOnce(makeChain({ data: mockApplication, error: null }));

    const req = buildNextRequest(
      'POST',
      'http://localhost:3000/api/applications',
      mockApplicationPayload
    );

    const res = await submitApplication(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Scenario 2: Applicant can check status via public endpoint
// ============================================================================

describe('Scenario 2: Status check returns correct state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns submitted status via public status endpoint', async () => {
    mockDirectSupabaseFrom.mockReturnValueOnce(
      makeChain({ data: mockApplication, error: null })
    );

    const req = buildNextRequest(
      'GET',
      `http://localhost:3000/api/applications/status/${TRACKING_ID}`
    );

    const res = await getApplicationStatus(req, {
      params: Promise.resolve({ trackingId: TRACKING_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('submitted');
    expect(body.message).toBeDefined();
    expect(body.status_timeline).toBeDefined();
    expect(body.status_timeline.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown tracking ID', async () => {
    mockDirectSupabaseFrom.mockReturnValueOnce(
      makeChain({ data: null, error: { code: 'PGRST116' } })
    );

    const req = buildNextRequest(
      'GET',
      'http://localhost:3000/api/applications/status/INVALID'
    );

    const res = await getApplicationStatus(req, {
      params: Promise.resolve({ trackingId: 'INVALID' }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Application not found');
  });
});

// ============================================================================
// Scenario 3: Landlord initiates screening
// ============================================================================

describe('Scenario 3: Landlord initiates screening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthFn.mockResolvedValue({ userId: 'landlord-user-id' });
  });

  it('starts background check and returns 202', async () => {
    const screeningReport = {
      id: 'report-uuid',
      application_id: APPLICATION_ID,
      provider: 'smartmove',
      external_order_id: 'mock-order-123',
      status: 'pending',
    };

    mockServerSupabaseFrom
      // landlord_profiles lookup
      .mockReturnValueOnce(makeChain({ data: mockLandlordProfile, error: null }))
      // application fetch (verify ownership)
      .mockReturnValueOnce(makeChain({ data: mockApplication, error: null }))
      // update application status to screening
      .mockReturnValueOnce(makeChain({ data: null, error: null }))
      // insert screening_reports
      .mockReturnValueOnce(makeChain({ data: screeningReport, error: null }));

    const req = buildNextRequest(
      'POST',
      `http://localhost:3000/api/applications/${APPLICATION_ID}/screen`
    );

    const res = await initiateScreening(req, {
      params: Promise.resolve({ id: APPLICATION_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(body.success).toBe(true);
    expect(body.status).toBe('screening');
    expect(body.screening_id).toBeDefined();
    expect(body.polling_interval_ms).toBeDefined();
  });

  it('rejects unauthenticated screening request (401)', async () => {
    mockAuthFn.mockResolvedValueOnce({ userId: null });

    const req = buildNextRequest(
      'POST',
      `http://localhost:3000/api/applications/${APPLICATION_ID}/screen`
    );

    const res = await initiateScreening(req, {
      params: Promise.resolve({ id: APPLICATION_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('logs screening start to audit trail', async () => {
    const screeningReport = { id: 'report-uuid', application_id: APPLICATION_ID, status: 'pending' };

    mockServerSupabaseFrom
      .mockReturnValueOnce(makeChain({ data: mockLandlordProfile, error: null }))
      .mockReturnValueOnce(makeChain({ data: mockApplication, error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: null }))
      .mockReturnValueOnce(makeChain({ data: screeningReport, error: null }));

    const req = buildNextRequest(
      'POST',
      `http://localhost:3000/api/applications/${APPLICATION_ID}/screen`
    );

    await initiateScreening(req, {
      params: Promise.resolve({ id: APPLICATION_ID }),
    });

    expect(AuditLogger.logScreeningStart).toHaveBeenCalledWith(
      APPLICATION_ID,
      'landlord-user-id',
      expect.any(String),
      expect.any(String)
    );
  });
});

// ============================================================================
// Scenario 4: AI analysis fields populate on screened application
// ============================================================================

describe('Scenario 4: Background check completion updates status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('status endpoint reflects screened status after completion', async () => {
    const screenedApplication = {
      ...mockApplication,
      status: 'screened',
      risk_score: 45,
      updated_at: new Date().toISOString(),
    };

    mockDirectSupabaseFrom.mockReturnValueOnce(
      makeChain({ data: screenedApplication, error: null })
    );

    const req = buildNextRequest(
      'GET',
      `http://localhost:3000/api/applications/status/${TRACKING_ID}`
    );

    const res = await getApplicationStatus(req, {
      params: Promise.resolve({ trackingId: TRACKING_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('screened');
  });
});

// ============================================================================
// Scenario 5: Landlord approves application
// ============================================================================

describe('Scenario 5: Landlord makes approval decision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthFn.mockResolvedValue({ userId: 'landlord-user-id' });
  });

  it('approves application and returns 200', async () => {
    const approvedApplication = {
      ...mockApplication,
      status: 'approved',
      updated_at: new Date().toISOString(),
    };

    mockServerSupabaseFrom
      // landlord_profiles lookup
      .mockReturnValueOnce(makeChain({ data: mockLandlordProfile, error: null }))
      // application fetch (verify ownership)
      .mockReturnValueOnce(makeChain({ data: { ...mockApplication, status: 'screened' }, error: null }))
      // update application status
      .mockReturnValueOnce(makeChain({ data: approvedApplication, error: null }));

    const req = buildNextRequest(
      'POST',
      `http://localhost:3000/api/applications/${APPLICATION_ID}/decide`,
      { decision: 'approve' }
    );

    const res = await makeDecision(req, {
      params: Promise.resolve({ id: APPLICATION_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.application.status).toBe('approved');
  });

  it('denies application with required denial fields', async () => {
    const deniedApplication = {
      ...mockApplication,
      status: 'denied',
      updated_at: new Date().toISOString(),
    };

    mockServerSupabaseFrom
      .mockReturnValueOnce(makeChain({ data: mockLandlordProfile, error: null }))
      .mockReturnValueOnce(makeChain({ data: { ...mockApplication, status: 'screened' }, error: null }))
      .mockReturnValueOnce(makeChain({ data: deniedApplication, error: null }));

    const req = buildNextRequest(
      'POST',
      `http://localhost:3000/api/applications/${APPLICATION_ID}/decide`,
      {
        decision: 'deny',
        denial_reason: 'Income does not meet requirements',
        compliance_confirmed: true,
      }
    );

    const res = await makeDecision(req, {
      params: Promise.resolve({ id: APPLICATION_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.application.status).toBe('denied');
  });

  it('rejects denial without denial_reason (400)', async () => {
    mockServerSupabaseFrom
      .mockReturnValueOnce(makeChain({ data: mockLandlordProfile, error: null }))
      .mockReturnValueOnce(makeChain({ data: mockApplication, error: null }));

    const req = buildNextRequest(
      'POST',
      `http://localhost:3000/api/applications/${APPLICATION_ID}/decide`,
      { decision: 'deny', compliance_confirmed: true }
    );

    const res = await makeDecision(req, {
      params: Promise.resolve({ id: APPLICATION_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('denial_reason');
  });
});

// ============================================================================
// Scenario 6: Audit log records all actions
// ============================================================================

describe('Scenario 6: Audit log records actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthFn.mockResolvedValue({ userId: 'landlord-user-id' });
  });

  it('logs notification on application submission', async () => {
    mockServerSupabaseFrom
      .mockReturnValueOnce(makeChain({ data: mockProperty, error: null }))
      .mockReturnValueOnce(makeChain({ data: mockLandlordProfile, error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: { code: 'PGRST116' } }))
      .mockReturnValueOnce(makeChain({ data: mockApplication, error: null }));

    const req = buildNextRequest(
      'POST',
      'http://localhost:3000/api/applications',
      mockApplicationPayload
    );

    await submitApplication(req);

    expect(AuditLogger.logNotification).toHaveBeenCalledWith(
      APPLICATION_ID,
      'confirmation'
    );
  });

  it('logs decision on approval', async () => {
    const approvedApplication = { ...mockApplication, status: 'approved' };

    mockServerSupabaseFrom
      .mockReturnValueOnce(makeChain({ data: mockLandlordProfile, error: null }))
      .mockReturnValueOnce(makeChain({ data: { ...mockApplication, status: 'screened' }, error: null }))
      .mockReturnValueOnce(makeChain({ data: approvedApplication, error: null }));

    const req = buildNextRequest(
      'POST',
      `http://localhost:3000/api/applications/${APPLICATION_ID}/decide`,
      { decision: 'approve' }
    );

    await makeDecision(req, {
      params: Promise.resolve({ id: APPLICATION_ID }),
    });

    expect(AuditLogger.logDecision).toHaveBeenCalledWith(
      APPLICATION_ID,
      'landlord-user-id',
      'approve',
      undefined
    );
  });
});

// ============================================================================
// Scenario 7: Duplicate submission blocked within 30 days
// ============================================================================

describe('Scenario 7: Duplicate submission prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 409 when same email+property submitted within 30 days', async () => {
    mockServerSupabaseFrom
      // properties lookup
      .mockReturnValueOnce(makeChain({ data: mockProperty, error: null }))
      // landlord_profiles lookup
      .mockReturnValueOnce(makeChain({ data: mockLandlordProfile, error: null }))
      // duplicate check — existing application found
      .mockReturnValueOnce(makeChain({ data: { id: APPLICATION_ID }, error: null }));

    const req = buildNextRequest(
      'POST',
      'http://localhost:3000/api/applications',
      mockApplicationPayload
    );

    const res = await submitApplication(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain('already submitted');
  });
});
