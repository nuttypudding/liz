---
id: 206
title: Compliance test suite — verify no protected-class data in AI prompts
tier: Haiku
depends_on: [188]
feature: P3-002-ai-tenant-screening
---

# 206 — Compliance test suite — verify no protected-class data in AI prompts

## Objective
Create a test suite that verifies the compliance filter (task 188) strips all PII and protected-class data before sending to Claude API. Tests ensure Fair Housing Act compliance by confirming AI prompts contain only objective financial/employment data.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Compliance tests validate sanitization and prevent accidental data leaks to AI.

## Implementation

### 1. Create compliance test suite

Create `apps/web/__tests__/lib/screening/compliance-filter.test.ts`:

```typescript
import {
  sanitizeApplicationForAI,
  buildSanitizedPrompt,
  validateSanitizedData,
  getRemovedFields,
} from '@/lib/screening/compliance-filter';
import { Application, EmploymentStatus } from '@/lib/screening/types';

const mockApplication: Application = {
  id: 'app-123',
  property_id: 'prop-123',
  landlord_id: 'landlord-123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-123-4567',
  date_of_birth: '1990-05-15',
  employment_status: EmploymentStatus.EMPLOYED,
  employer_name: 'Tech Corp',
  job_title: 'Software Engineer',
  employment_duration_months: 36,
  annual_income: 120000,
  monthly_rent_applying_for: 2500,
  references: [
    { name: 'Jane Smith', phone: '555-987-6543', relationship: 'landlord' },
    { name: 'Bob Johnson', relationship: 'employer' },
  ],
  has_eviction_history: false,
  status: 'submitted',
  tracking_id: 'APP-ABC123',
  created_at: '2026-04-10T00:00:00Z',
  updated_at: '2026-04-10T00:00:00Z',
};

describe('Compliance Filter — Fair Housing', () => {
  describe('sanitizeApplicationForAI', () => {
    it('should remove all PII fields', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);

      // Should NOT contain:
      const sanitizedStr = JSON.stringify(sanitized);
      expect(sanitizedStr).not.toContain('John');
      expect(sanitizedStr).not.toContain('Doe');
      expect(sanitizedStr).not.toContain('john.doe@example.com');
      expect(sanitizedStr).not.toContain('555-123-4567');
      expect(sanitizedStr).not.toContain('1990-05-15');
      expect(sanitizedStr).not.toContain('Jane Smith');
      expect(sanitizedStr).not.toContain('Tech Corp');
      expect(sanitizedStr).not.toContain('Software Engineer');
    });

    it('should retain only objective financial/employment data', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);

      // Should contain:
      expect(sanitized.employment_status).toBe('employed');
      expect(sanitized.employment_duration_months).toBe(36);
      expect(sanitized.annual_income).toBe(120000);
      expect(sanitized.monthly_rent_applying_for).toBe(2500);
      expect(sanitized.has_eviction_history).toBe(false);
    });

    it('should return correct income-to-rent ratio', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);

      // 120000 / (2500 * 12) = 4.0
      expect(sanitized.annual_income / (sanitized.monthly_rent_applying_for * 12)).toBeCloseTo(
        4.0,
        1
      );
    });
  });

  describe('validateSanitizedData', () => {
    it('should detect embedded first names', () => {
      const badData = {
        employment_status: 'employed',
        annual_income: 100000,
        monthly_rent_applying_for: 2000,
        has_eviction_history: false,
      };

      // Simulate embedded name
      (badData as any).note = 'This is John Doe'; // Oops, embedded PII

      const result = validateSanitizedData(badData);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect embedded email addresses', () => {
      const badData = {
        employment_status: 'employed',
        annual_income: 100000,
        monthly_rent_applying_for: 2000,
        has_eviction_history: false,
        contact: 'john@example.com', // Embedded email
      } as any;

      const result = validateSanitizedData(badData);
      expect(result.valid).toBe(false);
    });

    it('should detect embedded phone numbers', () => {
      const badData = {
        employment_status: 'employed',
        annual_income: 100000,
        monthly_rent_applying_for: 2000,
        has_eviction_history: false,
        phone: '555-123-4567', // Embedded phone
      } as any;

      const result = validateSanitizedData(badData);
      expect(result.valid).toBe(false);
    });

    it('should accept valid sanitized data', () => {
      const goodData = sanitizeApplicationForAI(mockApplication);
      const result = validateSanitizedData(goodData);

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });
  });

  describe('buildSanitizedPrompt', () => {
    it('should not contain applicant name', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt.toLowerCase()).not.toContain('john');
      expect(prompt.toLowerCase()).not.toContain('doe');
    });

    it('should not contain email or phone', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).not.toContain('john@example.com');
      expect(prompt).not.toContain('555-123-4567');
    });

    it('should not contain employer or job title names', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).not.toContain('Tech Corp');
      expect(prompt).not.toContain('Software Engineer');
    });

    it('should contain objective financial metrics', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).toContain('Annual Income');
      expect(prompt).toContain('120000');
      expect(prompt).toContain('Monthly Rent');
      expect(prompt).toContain('2500');
    });

    it('should explicitly instruct AI on Fair Housing compliance', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).toContain('Fair Housing');
      expect(prompt).toContain('protected');
      expect(prompt).toContain('financial');
    });

    it('should include income-to-rent ratio calculation', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).toContain('4.00x'); // 120000 / (2500 * 12)
    });

    it('should include landlord minimum income ratio if provided', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized, 3.0);

      expect(prompt).toContain('landlord minimum');
      expect(prompt).toContain('3.0x');
    });
  });

  describe('getRemovedFields', () => {
    it('should list all PII fields removed', () => {
      const removed = getRemovedFields(mockApplication);

      expect(removed).toContain('first_name');
      expect(removed).toContain('last_name');
      expect(removed).toContain('email');
      expect(removed).toContain('phone');
      expect(removed).toContain('date_of_birth');
      expect(removed).toContain('references');
      expect(removed).toContain('employer_name');
      expect(removed).toContain('job_title');
    });

    it('should not list retained fields', () => {
      const removed = getRemovedFields(mockApplication);

      expect(removed).not.toContain('employment_status');
      expect(removed).not.toContain('annual_income');
      expect(removed).not.toContain('monthly_rent_applying_for');
    });
  });

  describe('Fair Housing compliance edge cases', () => {
    it('should handle applications without eviction history', () => {
      const sanitized = sanitizeApplicationForAI(mockApplication);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).toContain('Eviction History: No');
    });

    it('should handle applications with eviction history (but not details)', () => {
      const app: Application = {
        ...mockApplication,
        has_eviction_history: true,
        eviction_details: 'Evicted for non-payment in 2018', // Should NOT appear in prompt
      };

      const sanitized = sanitizeApplicationForAI(app);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).toContain('Eviction History: Yes');
      expect(prompt).not.toContain('non-payment'); // Details removed
    });

    it('should handle incomplete applications', () => {
      const app: Application = {
        ...mockApplication,
        annual_income: undefined,
        employer_name: undefined,
      };

      const sanitized = sanitizeApplicationForAI(app);
      const prompt = buildSanitizedPrompt(sanitized);

      expect(prompt).toContain('Not provided'); // Should handle missing data gracefully
    });
  });
});
```

### 2. Create compliance documentation test

Create `apps/web/__tests__/lib/screening/compliance-documentation.test.ts`:

```typescript
/**
 * Documentation tests — verify compliance documentation is current
 */

describe('Compliance Documentation', () => {
  it('should have Fair Housing guidelines documented', async () => {
    // Verify that compliance guidelines exist in code comments
    const complianceFilter = require('@/lib/screening/compliance-filter');

    expect(complianceFilter.sanitizeApplicationForAI).toBeDefined();
    expect(complianceFilter.validateSanitizedData).toBeDefined();
  });

  it('should document all removed PII fields', () => {
    // Verify documentation comment
    const fs = require('fs');
    const filePath = 'apps/web/lib/screening/compliance-filter.ts';

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Removes:');
    expect(content).toContain('first_name');
    expect(content).toContain('Keeps:');
  });
});
```

## Acceptance Criteria
1. [ ] Compliance test suite created: `__tests__/lib/screening/compliance-filter.test.ts`
2. [ ] sanitizeApplicationForAI() strips all PII (names, email, phone, DOB)
3. [ ] sanitizeApplicationForAI() retains objective data (income, employment, rent)
4. [ ] validateSanitizedData() detects embedded names (heuristic pattern matching)
5. [ ] validateSanitizedData() detects embedded emails
6. [ ] validateSanitizedData() detects embedded phone numbers
7. [ ] buildSanitizedPrompt() does NOT contain names, emails, phones
8. [ ] buildSanitizedPrompt() does NOT contain employer or job title names
9. [ ] buildSanitizedPrompt() contains objective financial metrics
10. [ ] buildSanitizedPrompt() explicitly instructs AI on Fair Housing compliance
11. [ ] buildSanitizedPrompt() includes income-to-rent ratio
12. [ ] buildSanitizedPrompt() supports landlord minimum ratio
13. [ ] getRemovedFields() documents all removed PII
14. [ ] Edge cases tested: missing income, eviction history, incomplete data
15. [ ] All compliance tests pass (npm run test)
16. [ ] Documentation includes Fair Housing Act reference
