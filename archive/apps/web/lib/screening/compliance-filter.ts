import { Application } from './types';

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
  credit_score_range?: string;
}

/**
 * Compliance-filtered prompt snapshot (for audit trail)
 * Stores what data was sent to AI for compliance verification
 */
export interface ComplianceAuditSnapshot {
  filter_applied_at: string;
  data_removed: string[];
  data_sent: SanitizedApplicationData;
  ai_model: string;
  prompt_hash?: string;
}

/**
 * Sanitize application data before sending to Claude.
 * Removes: first_name, last_name, date_of_birth, phone, email, references,
 *          employer_name, job_title, eviction_details
 * Keeps: employment_status, employment_duration_months, annual_income,
 *        monthly_rent_applying_for, has_eviction_history, credit_score_range
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
 * Create compliance audit snapshot for storing in screening_reports.prompt_snapshot
 */
export function createComplianceAuditSnapshot(
  application: Application,
  sanitized: SanitizedApplicationData
): ComplianceAuditSnapshot {
  return {
    filter_applied_at: new Date().toISOString(),
    data_removed: getRemovedFields(application),
    data_sent: sanitized,
    ai_model: 'claude-sonnet-4-20250514',
  };
}

/**
 * Validate that sanitized data contains no PII.
 * Used in tests and pre-send validation.
 */
export function validateSanitizedData(data: SanitizedApplicationData): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const dataString = JSON.stringify(data).toLowerCase();

  // Email patterns
  if (dataString.match(/\S+@\S+\.\S+/)) {
    issues.push('Email detected in sanitized data');
  }

  // Phone number patterns
  if (dataString.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/)) {
    issues.push('Phone number detected in sanitized data');
  }

  // Date of birth patterns (YYYY-MM-DD)
  if (dataString.match(/\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/)) {
    issues.push('Date of birth pattern detected in sanitized data');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Build sanitized prompt for Claude API.
 * Contains only objective financial/employment factors.
 */
export function buildSanitizedPrompt(
  sanitized: SanitizedApplicationData,
  landlordMinIncomeRatio?: number
): string {
  const incomeToRentRatio = sanitized.annual_income
    ? sanitized.annual_income / (sanitized.monthly_rent_applying_for * 12)
    : undefined;

  return `You are a rental application screening assistant. Analyze the following applicant data objectively based ONLY on financial and employment stability indicators. Do NOT make decisions based on any protected characteristics.

APPLICANT DATA (all PII removed):
- Employment Status: ${sanitized.employment_status}
- Employment Duration: ${sanitized.employment_duration_months ?? 'Not provided'} months
- Annual Income: $${sanitized.annual_income?.toLocaleString() ?? 'Not provided'}
- Monthly Rent Applying For: $${sanitized.monthly_rent_applying_for.toLocaleString()}
- Income-to-Rent Ratio: ${incomeToRentRatio?.toFixed(2) ?? 'N/A'}x${landlordMinIncomeRatio ? ` (landlord minimum: ${landlordMinIncomeRatio}x)` : ''}
- Credit Score Range: ${sanitized.credit_score_range ?? 'Pending background check'}
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
}`;
}
