import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockApplicationPayload,
  mockApplicationPayloadVariants,
  createMockNextRequest,
} from './screening.test-utils';
import { validateApplicationPayload } from '@/lib/screening/validation';

// --- Setup mocks with hoisted factory (must come before imports that use them) ---
const mockSupabaseChain = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

const mockSupabaseFrom = vi.hoisted(() => vi.fn().mockReturnValue(mockSupabaseChain));

const mockGetAuth = vi.hoisted(() =>
  vi.fn(() => ({ userId: null, sessionId: null, actor: null, getToken: vi.fn() }))
);

const mockClerkClient = vi.hoisted(() =>
  vi.fn(() => ({
    users: {
      getUser: vi.fn(),
    },
  }))
);

const mockSendApplicationConfirmation = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const mockSendLandlordNewApplicationNotification = vi.hoisted(() =>
  vi.fn().mockResolvedValue(true)
);

const mockAuditLoggerLogNotification = vi.hoisted(() => vi.fn().mockResolvedValue(true));

// --- Mock Supabase ---
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

// --- Mock Clerk ---
vi.mock('@clerk/nextjs/server', () => ({
  getAuth: mockGetAuth,
  clerkClient: mockClerkClient,
}));

// --- Mock email service ---
vi.mock('@/lib/email/screening-service', () => ({
  sendApplicationConfirmation: mockSendApplicationConfirmation,
  sendLandlordNewApplicationNotification: mockSendLandlordNewApplicationNotification,
}));

// --- Mock audit logger ---
vi.mock('@/lib/screening/audit-log', () => ({
  AuditLogger: {
    logNotification: mockAuditLoggerLogNotification,
  },
}));

// Now import after mocks are set up
import { POST as submitApplication, GET as listApplications } from '@/app/api/applications/route';

describe('/api/applications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST (submit application)', () => {
    it('should reject missing required fields', async () => {
      const payload = mockApplicationPayloadVariants.missingFirstName();

      const req = createMockNextRequest('POST', 'http://localhost:3000/api/applications', {
        body: payload,
      });

      const res = await submitApplication(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.details).toContain('first_name is required');
    });

    it('should reject invalid email', async () => {
      const payload = mockApplicationPayloadVariants.withInvalidEmail();

      const req = createMockNextRequest('POST', 'http://localhost:3000/api/applications', {
        body: payload,
      });

      const res = await submitApplication(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('should reject negative rent amount', async () => {
      const payload = {
        ...mockApplicationPayload,
        monthly_rent_applying_for: -1000,
      };

      const req = createMockNextRequest('POST', 'http://localhost:3000/api/applications', {
        body: payload,
      });

      const res = await submitApplication(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('should return 404 if property not found', async () => {
      // Property lookup fails
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      });

      const req = createMockNextRequest('POST', 'http://localhost:3000/api/applications', {
        body: mockApplicationPayload,
      });

      const res = await submitApplication(req);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toContain('Property not found');
    });
  });

  describe('GET (list applications)', () => {
    it('should require authentication', async () => {
      const req = createMockNextRequest('GET', 'http://localhost:3000/api/applications');

      const res = await listApplications(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('Validation', () => {
    it('should pass valid payload', () => {
      const result = validateApplicationPayload(mockApplicationPayload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing email', () => {
      const payload = { ...mockApplicationPayload, email: '' };
      const result = validateApplicationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('email is required');
    });

    it('should reject invalid phone', () => {
      const payload = { ...mockApplicationPayload, phone: 'invalid' };
      const result = validateApplicationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('phone'))).toBe(true);
    });

    it('should reject missing monthly rent', () => {
      const payload = { ...mockApplicationPayload, monthly_rent_applying_for: 0 };
      const result = validateApplicationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('monthly_rent'))).toBe(true);
    });

    it('should accept optional references', () => {
      const payload = { ...mockApplicationPayload, references: [] };
      const result = validateApplicationPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid date format', () => {
      const payload = { ...mockApplicationPayload, date_of_birth: 'invalid-date' };
      const result = validateApplicationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('date'))).toBe(true);
    });

    it('should accept valid date format', () => {
      const payload = { ...mockApplicationPayload, date_of_birth: '1990-01-15' };
      const result = validateApplicationPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should validate employment status enum', () => {
      const payload = { ...mockApplicationPayload, employment_status: 'invalid' as any };
      const result = validateApplicationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('employment_status'))).toBe(true);
    });

    it('should reject negative income', () => {
      const payload = { ...mockApplicationPayload, annual_income: -50000 };
      const result = validateApplicationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('annual_income'))).toBe(true);
    });

    it('should accept zero income', () => {
      const payload = { ...mockApplicationPayload, annual_income: 0 };
      const result = validateApplicationPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should validate references array', () => {
      const payload = {
        ...mockApplicationPayload,
        references: [{ name: '', relationship: 'landlord' }],
      };
      const result = validateApplicationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('references'))).toBe(true);
    });
  });
});
