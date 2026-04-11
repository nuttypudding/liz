import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApplicationSubmissionPayload, EmploymentStatus } from '@/lib/screening/types';

/**
 * Mock Supabase client for testing
 */
export const createMockSupabaseClient = () => {
  const mockFrom = vi.fn().mockReturnThis();
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockGte = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockRange = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();

  return {
    from: mockFrom,
    mockSelect,
    mockInsert,
    mockDelete,
    mockEq,
    mockGte,
    mockOrder,
    mockRange,
    mockSingle,
  };
};

/**
 * Mock Application Submission Payload for testing
 */
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

/**
 * Alternative mock payloads for different test scenarios
 */
export const mockApplicationPayloadVariants = {
  // For testing duplicate prevention
  withDifferentEmail: (email: string): ApplicationSubmissionPayload => ({
    ...mockApplicationPayload,
    email,
  }),

  // For testing invalid email
  withInvalidEmail: (): ApplicationSubmissionPayload => ({
    ...mockApplicationPayload,
    email: 'invalid-email',
  }),

  // For testing missing required fields
  missingFirstName: (): ApplicationSubmissionPayload => ({
    ...mockApplicationPayload,
    first_name: '',
  }),

  // For testing with eviction history
  withEvictionHistory: (): ApplicationSubmissionPayload => ({
    ...mockApplicationPayload,
    has_eviction_history: true,
    eviction_details: 'Evicted due to non-payment in 2020',
  }),

  // For testing self-employed
  selfEmployed: (): ApplicationSubmissionPayload => ({
    ...mockApplicationPayload,
    employment_status: EmploymentStatus.SELF_EMPLOYED,
    employer_name: 'My Business',
  }),

  // For testing low income
  lowIncome: (): ApplicationSubmissionPayload => ({
    ...mockApplicationPayload,
    annual_income: 24000, // Only $2000/month, same as rent
  }),

  // For testing high income
  highIncome: (): ApplicationSubmissionPayload => ({
    ...mockApplicationPayload,
    annual_income: 300000, // $25k/month, excellent ratio
  }),
};

/**
 * Create a mock NextRequest for testing API endpoints
 */
export const createMockNextRequest = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  options?: {
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  }
): Request => {
  const urlObj = new URL(url, 'http://localhost:3000');
  if (options?.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value);
    });
  }

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };

  if (options?.body) {
    init.body = JSON.stringify(options.body);
  }

  return new Request(urlObj.toString(), init);
};

/**
 * Create a mock NextResponse for testing
 */
export const createMockNextResponse = (data: unknown, status: number = 200) => {
  return {
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    ok: status >= 200 && status < 300,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  };
};
