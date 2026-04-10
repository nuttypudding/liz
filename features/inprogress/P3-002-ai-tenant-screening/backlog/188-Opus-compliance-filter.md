---
id: 188
title: Compliance filter — pre-prompt sanitization module
tier: Opus
depends_on: [182]
feature: P3-002-ai-tenant-screening
---

# 188 — Compliance filter — pre-prompt sanitization module

## Objective
Create a compliance filter module that sanitizes applicant data before sending to Claude API. Remove all protected-class indicators (names, DOB-derived age, and any other PII) and ensure only objective job and income data are sent to the AI. This ensures Fair Housing Act compliance by preventing AI from seeing protected characteristics.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Fair Housing Act compliance requires that screening decisions not be based on protected classes (race, color, religion, sex, national origin, familial status, disability, source of income in some jurisdictions). This filter strips all PII before AI analysis.

## Implementation

### 1. Create compliance filter module

Create `apps/web/lib/screening/compliance-filter.ts`:

```typescript
import { Application, AIScreeningAnalysis } from './types';

/**
 * Sanitized application data safe to send to Claude API
 * All protected-class indicators and PII removed
 */
export interface SanitizedApplicationData {
  employment_status: string;
  employment_duration_months?: number;
  annual_income?: number;
  monthly_rent_applying_for: number;
  has_eviction_history: boolean;
  credit_score_range?: string; // From screening provider, if available
}

/**
 * Compliance-filtered prompt snapshot (for audit trail)
 * Stores what data was sent to AI for compliance verification
 */
export interface ComplianceAuditSnapshot {
  filter_applied_at: string;
  data_removed: string[]; // Fields that were stripped
  data_sent: SanitizedApplicationData;
  ai_model: string;
  prompt_hash?: string; // Optional: SHA-256 hash of prompt for verification
}

/**
 * Sanitize application data before sending to Claude
 * Removes: first_name, last_name, date_of_birth, phone, email, references
 * Keeps: employment, income, rent amount, eviction history, credit range
 */
export function sanitizeApplicationForAI(
  application: Application,
  creditScoreRange?: string
): SanitizedApplicationData {
  return {
    employment_status: application.employment_status,
    employment_duration_months: application.employment_duration_months,
    annual_income: application.annual_income,
    monthly_rent_applying_for: application.monthly_rent_applying_for,
    has_eviction_history: application.has_eviction_history,
    credit_score_range: creditScoreRange,
  };
}

/**
 * Get list of fields removed for audit trail
 */
export function getRemovedFields(application: Application): string[] {
  const removed: string[] = [];

  if (application.first_name) removed.push('first_name');
  if (application.last_name) removed.push('last_name');
  if (application.date_of_birth) removed.push('date_of_birth');
  if (application.phone) removed.push('phone');
  if (application.email) removed.push('email');
  if (application.references && application.references.length > 0) {
    removed.push('references');
  }
  if (application.employer_name) removed.push('employer_name');
  if (application.job_title) removed.push('job_title');
  if (application.eviction_details) removed.push('eviction_details');

  return removed;
}

/**
 * Create compliance audit snapshot
 * Used when storing prompt in screening_reports.prompt_snapshot
 */
export function createComplianceAuditSnapshot(
  application: Application,
  sanitized: SanitizedApplicationData,
  creditScoreRange?: string
): ComplianceAuditSnapshot {
  const removedFields = getRemovedFields(application);

  return {
    filter_applied_at: new Date().toISOString(),
    data_removed: removedFields,
    data_sent: sanitized,
    ai_model: 'claude-3-5-sonnet-20241022', // Or current model
  };
}

/**
 * Validate that sanitized data contains no PII
 * Used in tests and pre-send validation
 */
export function validateSanitizedData(data: SanitizedApplicationData): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for common PII patterns
  const dataString = JSON.stringify(data).toLowerCase();

  // Don't allow recognizable names (simple heuristic)
  if (dataString.match(/\b(john|jane|mary|michael|david|robert)\b/)) {
    issues.push('Possible first name detected in sanitized data');
  }

  // Don't allow email patterns
  if (dataString.match(/\S+@\S+\.\S+/)) {
    issues.push('Email detected in sanitized data');
  }

  // Don't allow phone number patterns
  if (dataString.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/)) {
    issues.push('Phone number detected in sanitized data');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Build sanitized prompt for Claude API
 */
export function buildSanitizedPrompt(
  sanitized: SanitizedApplicationData,
  landlordMinIncomeRatio?: number
): string {
  const incomeToRentRatio = sanitized.annual_income
    ? sanitized.annual_income / (sanitized.monthly_rent_applying_for * 12)
    : undefined;

  return `
You are a rental application screening assistant. Analyze the following applicant data objectively based ONLY on financial and employment stability indicators. Do NOT make decisions based on any protected characteristics.

APPLICANT DATA (all PII removed):
- Employment Status: ${sanitized.employment_status}
- Employment Duration: ${sanitized.employment_duration_months || 'Not provided'} months
- Annual Income: $${sanitized.annual_income?.toLocaleString() || 'Not provided'}
- Monthly Rent Applying For: $${sanitized.monthly_rent_applying_for.toLocaleString()}
- Income-to-Rent Ratio: ${incomeToRentRatio?.toFixed(2) || 'N/A'}x${landlordMinIncomeRatio ? ` (landlord minimum: ${landlordMinIncomeRatio}x)` : ''}
- Credit Score Range: ${sanitized.credit_score_range || 'Pending background check'}
- Eviction History: ${sanitized.has_eviction_history ? 'Yes' : 'No'}

OBJECTIVE FACTORS TO EVALUATE:
1. Income Stability: Is annual income sufficient relative to rent amount? Does employment duration suggest stability?
2. Financial Capacity: Does income-to-rent ratio meet typical lending thresholds (3.0x or higher is strong)?
3. Credit Indicators: What does the available credit data suggest about payment history?
4. Rental History: Does eviction history indicate past payment defaults?

FAIR HOUSING COMPLIANCE:
- Base analysis ONLY on financial and employment factors above.
- Do NOT reference or infer protected characteristics (age, race, color, religion, national origin, sex, familial status, disability, source of income).
- If you cannot evaluate a factor due to missing data, note it but continue analysis.

Provide your assessment in JSON format with these fields:
{
  "risk_factors": [
    {
      "category": "income|employment|credit|rental_history|other",
      "name": "Factor name",
      "signal": "positive|neutral|concerning",
      "details": "Explanation",
      "weight": "low|medium|high"
    }
  ],
  "income_to_rent_ratio": <number>,
  "employment_stability_score": <0-100>,
  "credit_indicator": "good|fair|poor|no_data",
  "rental_history_signal": "positive|neutral|concerning",
  "summary": "Plain English summary of findings",
  "recommendation": "strong_approve|approve|conditional|deny",
  "confidence_score": <0-1>
}
`.trim();
}
```

### 2. Create tests

Create `apps/web/lib/screening/__tests__/compliance-filter.test.ts`:

```typescript
import {
  sanitizeApplicationForAI,
  getRemovedFields,
  createComplianceAuditSnapshot,
  validateSanitizedData,
  buildSanitizedPrompt,
} from '../compliance-filter';
import { Application, EmploymentStatus } from '../types';

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
    status: 'submitted',
    risk_score: undefined,
    tracking_id: 'APP-ABC123',
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  };

  test('sanitizeApplicationForAI removes PII', () => {
    const sanitized = sanitizeApplicationForAI(mockApplication);

    expect(sanitized).toEqual({
      employment_status: 'employed',
      employment_duration_months: 36,
      annual_income: 120000,
      monthly_rent_applying_for: 2000,
      has_eviction_history: false,
    });

    // Verify no PII in sanitized data
    const sanitizedJson = JSON.stringify(sanitized).toLowerCase();
    expect(sanitizedJson).not.toContain('john');
    expect(sanitizedJson).not.toContain('doe');
    expect(sanitizedJson).not.toContain('john@example.com');
    expect(sanitizedJson).not.toContain('1990');
  });

  test('getRemovedFields lists all removed PII', () => {
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

  test('createComplianceAuditSnapshot records what was sent', () => {
    const sanitized = sanitizeApplicationForAI(mockApplication);
    const snapshot = createComplianceAuditSnapshot(mockApplication, sanitized);

    expect(snapshot.data_removed).toContain('first_name');
    expect(snapshot.data_sent).toEqual(sanitized);
    expect(snapshot.filter_applied_at).toBeDefined();
  });

  test('validateSanitizedData detects embedded PII', () => {
    const badData = {
      employment_status: 'employed',
      employment_duration_months: 36,
      annual_income: 120000,
      monthly_rent_applying_for: 2000,
      has_eviction_history: false,
      // Simulate a PII leak
      email: 'john@example.com', // This shouldn't be here
    };

    const result = validateSanitizedData(badData as any);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  test('buildSanitizedPrompt calculates income-to-rent ratio', () => {
    const sanitized = sanitizeApplicationForAI(mockApplication);
    const prompt = buildSanitizedPrompt(sanitized);

    // 120000 / (2000 * 12) = 5.0x
    expect(prompt).toContain('5.00x');
  });

  test('buildSanitizedPrompt contains no names or emails', () => {
    const sanitized = sanitizeApplicationForAI(mockApplication);
    const prompt = buildSanitizedPrompt(sanitized);

    expect(prompt.toLowerCase()).not.toContain('john');
    expect(prompt.toLowerCase()).not.toContain('doe');
    expect(prompt).not.toContain('john@example.com');
  });
});
```

## Acceptance Criteria
1. [ ] Sanitization function removes: first_name, last_name, email, phone, date_of_birth, employer_name, job_title, references, eviction_details
2. [ ] Sanitized data retains: employment_status, employment_duration_months, annual_income, monthly_rent_applying_for, has_eviction_history, credit_score_range
3. [ ] getRemovedFields() lists all removed fields for audit trail
4. [ ] createComplianceAuditSnapshot() records what was sent to AI
5. [ ] validateSanitizedData() detects PII embedded in sanitized data (emails, phone patterns, common names)
6. [ ] buildSanitizedPrompt() creates fair-housing compliant prompt (no protected-class data)
7. [ ] Prompt includes only objective factors: income, employment, credit, eviction history
8. [ ] Prompt explicitly instructs AI to base decision on financial factors only
9. [ ] All unit tests pass (sanitization, validation, PII detection)
10. [ ] Compliance filter used in AI analysis task (task 189)
