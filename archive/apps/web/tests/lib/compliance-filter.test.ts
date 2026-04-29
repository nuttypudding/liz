import { describe, test, expect } from 'vitest';
import {
  sanitizeApplicationForAI,
  getRemovedFields,
  createComplianceAuditSnapshot,
  validateSanitizedData,
  buildSanitizedPrompt,
  SanitizedApplicationData,
} from '../../lib/screening/compliance-filter';
import { Application, EmploymentStatus, ApplicationStatus } from '../../lib/screening/types';

describe('Compliance Filter', () => {
  const mockApplication: Application = {
    id: '123',
    property_id: 'prop-123',
    landlord_id: 'landlord-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-123-4567',
    date_of_birth: '1990-01-15',
    employment_status: EmploymentStatus.EMPLOYED,
    employer_name: 'Tech Corp',
    job_title: 'Engineer',
    employment_duration_months: 36,
    annual_income: 120000,
    monthly_rent_applying_for: 2000,
    references: [{ name: 'Jane Smith', relationship: 'landlord' }],
    has_eviction_history: false,
    eviction_details: undefined,
    status: ApplicationStatus.SUBMITTED,
    risk_score: undefined,
    tracking_id: 'APP-ABC123',
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  };

  describe('sanitizeApplicationForAI', () => {
    test('removes PII and retains only financial/employment data', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);

      expect(sanitized).toEqual({
        employment_status: 'employed',
        employment_duration_months: 36,
        annual_income: 120000,
        monthly_rent_applying_for: 2000,
        has_eviction_history: false,
        credit_score_range: undefined,
      });
    });

    test('sanitized data contains no PII', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const json = JSON.stringify(sanitized).toLowerCase();

      expect(json).not.toContain('john');
      expect(json).not.toContain('doe');
      expect(json).not.toContain('john@example.com');
      expect(json).not.toContain('555');
      expect(json).not.toContain('1990');
      expect(json).not.toContain('tech corp');
      expect(json).not.toContain('engineer');
    });

    test('includes credit score range when provided', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication, '700-750');

      expect(sanitized.credit_score_range).toBe('700-750');
    });

    test('handles application with minimal data', () => {
      const minimal: Application = {
        ...mockApplication,
        phone: undefined,
        date_of_birth: undefined,
        employer_name: undefined,
        job_title: undefined,
        employment_duration_months: undefined,
        annual_income: undefined,
        references: [],
        eviction_details: undefined,
      };

      const sanitized = sanitizeApplicationForAI(minimal);

      expect(sanitized).toEqual({
        employment_status: 'employed',
        employment_duration_months: undefined,
        annual_income: undefined,
        monthly_rent_applying_for: 2000,
        has_eviction_history: false,
        credit_score_range: undefined,
      });
    });
  });

  describe('getRemovedFields', () => {
    test('lists all removed PII fields', () => {
      const removed = getRemovedFields(mockApplication);

      expect(removed).toContain('first_name');
      expect(removed).toContain('last_name');
      expect(removed).toContain('email');
      expect(removed).toContain('phone');
      expect(removed).toContain('date_of_birth');
      expect(removed).toContain('employer_name');
      expect(removed).toContain('job_title');
      expect(removed).toContain('references');
    });

    test('includes eviction_details when present', () => {
      const appWithEvictionDetails = {
        ...mockApplication,
        has_eviction_history: true,
        eviction_details: 'Evicted in 2020 for non-payment',
      };

      const removed = getRemovedFields(appWithEvictionDetails);
      expect(removed).toContain('eviction_details');
    });

    test('omits optional fields when not present', () => {
      const minimal: Application = {
        ...mockApplication,
        phone: undefined,
        date_of_birth: undefined,
        employer_name: undefined,
        job_title: undefined,
        references: [],
        eviction_details: undefined,
      };

      const removed = getRemovedFields(minimal);

      expect(removed).toContain('first_name');
      expect(removed).toContain('last_name');
      expect(removed).toContain('email');
      expect(removed).not.toContain('phone');
      expect(removed).not.toContain('date_of_birth');
      expect(removed).not.toContain('employer_name');
      expect(removed).not.toContain('job_title');
      expect(removed).not.toContain('references');
      expect(removed).not.toContain('eviction_details');
    });
  });

  describe('createComplianceAuditSnapshot', () => {
    test('records sanitized data and removed fields', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const snapshot = createComplianceAuditSnapshot(mockApplication, sanitized);

      expect(snapshot.data_removed).toContain('first_name');
      expect(snapshot.data_removed).toContain('last_name');
      expect(snapshot.data_removed).toContain('email');
      expect(snapshot.data_sent).toEqual(sanitized);
      expect(snapshot.filter_applied_at).toBeDefined();
      expect(snapshot.ai_model).toBeDefined();
    });

    test('filter_applied_at is a valid ISO timestamp', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const snapshot = createComplianceAuditSnapshot(mockApplication, sanitized);

      const parsed = new Date(snapshot.filter_applied_at);
      expect(parsed.toISOString()).toBe(snapshot.filter_applied_at);
    });
  });

  describe('validateSanitizedData', () => {
    test('passes for clean sanitized data', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const result = validateSanitizedData(sanitized);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('detects email in sanitized data', () => {
      const badData = {
        ...sanitizeApplicationForAI(mockApplication),
      } as SanitizedApplicationData & { email?: string };
      (badData as Record<string, unknown>).email = 'john@example.com';

      const result = validateSanitizedData(badData);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Email detected in sanitized data');
    });

    test('detects phone number in sanitized data', () => {
      const badData = {
        ...sanitizeApplicationForAI(mockApplication),
      } as SanitizedApplicationData & { phone?: string };
      (badData as Record<string, unknown>).phone = '555-123-4567';

      const result = validateSanitizedData(badData);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Phone number detected in sanitized data');
    });

    test('detects date of birth pattern in sanitized data', () => {
      const badData = {
        ...sanitizeApplicationForAI(mockApplication),
      } as SanitizedApplicationData & { dob?: string };
      (badData as Record<string, unknown>).dob = '1990-01-15';

      const result = validateSanitizedData(badData);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain(
        'Date of birth pattern detected in sanitized data'
      );
    });
  });

  describe('buildSanitizedPrompt', () => {
    test('calculates income-to-rent ratio', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      // 120000 / (2000 * 12) = 5.0x
      expect(prompt).toContain('5.00x');
    });

    test('includes landlord minimum ratio when provided', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized, 3.0);

      expect(prompt).toContain('(landlord minimum: 3x)');
    });

    test('contains no names or emails', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt.toLowerCase()).not.toContain('john');
      // Check 'Doe' as a standalone word (not substring of 'does')
      expect(prompt).not.toMatch(/\bDoe\b/);
      expect(prompt).not.toContain('john@example.com');
      expect(prompt).not.toContain('Tech Corp');
    });

    test('contains Fair Housing compliance instructions', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).toContain('FAIR HOUSING COMPLIANCE');
      expect(prompt).toContain('protected characteristics');
      expect(prompt).toContain('financial and employment factors');
    });

    test('instructs AI to base decision on financial factors only', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).toContain('ONLY on financial and employment stability indicators');
      expect(prompt).toContain('Do NOT make decisions based on any protected characteristics');
    });

    test('handles missing income gracefully', () => {
      const sanitized = sanitizeApplicationForAI({
        ...mockApplication,
        annual_income: undefined,
      });
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).toContain('N/A');
      expect(prompt).toContain('Not provided');
    });

    test('requests JSON response format', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).toContain('"risk_factors"');
      expect(prompt).toContain('"recommendation"');
      expect(prompt).toContain('"confidence_score"');
    });
  });
});
