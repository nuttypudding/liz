/**
 * Application Status Enum
 */
export enum ApplicationStatus {
  SUBMITTED = 'submitted',
  SCREENING = 'screening',
  SCREENED = 'screened',
  APPROVED = 'approved',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
}

/**
 * Risk Score Range
 */
export type RiskScore = number; // 1-100

/**
 * AI Screening Recommendation
 */
export enum ScreeningRecommendation {
  STRONG_APPROVE = 'strong_approve',
  APPROVE = 'approve',
  CONDITIONAL = 'conditional',
  DENY = 'deny',
}

/**
 * Screening Provider
 */
export enum ScreeningProvider {
  SMARTMOVE = 'smartmove',
  CHECKR = 'checkr',
}

/**
 * Employment Status
 */
export enum EmploymentStatus {
  EMPLOYED = 'employed',
  SELF_EMPLOYED = 'self-employed',
  RETIRED = 'retired',
  STUDENT = 'student',
  OTHER = 'other',
}

/**
 * Reference in rental history
 */
export interface Reference {
  name: string;
  phone?: string;
  relationship: string; // 'landlord', 'employer', 'personal'
  contact_method?: string;
}

/**
 * Application Data (DB schema)
 */
export interface Application {
  id: string; // UUID
  property_id: string; // UUID
  landlord_id: string; // UUID

  // Personal info
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string; // ISO date

  // Employment
  employment_status: EmploymentStatus;
  employer_name?: string;
  job_title?: string;
  employment_duration_months?: number;
  annual_income?: number;

  // Rental
  monthly_rent_applying_for: number;

  // References
  references: Reference[];

  // Rental history
  has_eviction_history: boolean;
  eviction_details?: string;

  // Status & scoring
  status: ApplicationStatus;
  risk_score?: RiskScore; // null until screening complete
  tracking_id: string; // unique, used by applicants to check status

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Screening Report Data (DB schema)
 */
export interface ScreeningReport {
  id: string; // UUID
  application_id: string; // UUID

  // Provider
  provider: ScreeningProvider;
  external_order_id?: string; // ID from third-party provider
  status: 'pending' | 'completed' | 'failed';

  // Credit check
  credit_score_range?: string; // '600-650', 'no-hit', etc.

  // Background check (provider-specific JSONB)
  background_result?: Record<string, unknown>;

  // AI analysis
  ai_analysis?: AIScreeningAnalysis;

  // Risk scoring
  risk_score?: RiskScore; // 1-100
  recommendation?: ScreeningRecommendation;

  // Audit
  prompt_snapshot?: Record<string, unknown>; // Sanitized prompt for compliance

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

/**
 * AI Screening Analysis (JSONB stored in screening_reports)
 */
export interface AIScreeningAnalysis {
  risk_factors: ScreeningFactor[];
  income_to_rent_ratio?: number;
  employment_stability_score?: number; // 0-100
  credit_indicator?: string; // 'good', 'fair', 'poor', 'no_data'
  rental_history_signal?: string; // 'positive', 'neutral', 'concerning'
  summary: string; // Plain English summary of analysis
  recommendation: ScreeningRecommendation;
  confidence_score?: number; // 0-1
}

/**
 * Individual screening factor (part of AI analysis)
 */
export interface ScreeningFactor {
  category: 'income' | 'employment' | 'credit' | 'rental_history' | 'other';
  name: string; // 'Income-to-Rent Ratio', 'Employment Duration', etc.
  signal: 'positive' | 'neutral' | 'concerning'; // Overall signal
  details: string; // Explanation
  weight?: 'low' | 'medium' | 'high'; // Importance in final score
}

/**
 * Screening Audit Log Entry
 */
export interface ScreeningAuditLogEntry {
  id: string; // UUID
  application_id: string; // UUID
  action: 'view' | 'screen' | 'decide' | 'export' | 'notify'; // Action type
  actor_id?: string; // User ID of person taking action (null = system)
  details?: Record<string, unknown>; // Action-specific details
  timestamp: string; // ISO datetime
}

/**
 * Landlord Screening Preferences (from landlord_profiles)
 */
export interface ScreeningPreferences {
  screening_provider: ScreeningProvider;
  min_income_ratio: number; // e.g., 3.0 means income >= 3 * monthly_rent
  auto_reject_eviction_history: boolean;
  require_background_check: boolean;
}

/**
 * Public Application Submission Payload (from applicant form)
 */
export interface ApplicationSubmissionPayload {
  property_id: string;

  // Personal
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;

  // Employment
  employment_status: EmploymentStatus;
  employer_name?: string;
  job_title?: string;
  employment_duration_months?: number;
  annual_income?: number;

  // Rental
  monthly_rent_applying_for: number;

  // References
  references: Reference[];

  // Rental history
  has_eviction_history: boolean;
  eviction_details?: string;

  // Consent
  agrees_to_background_check?: boolean;
  agrees_to_terms?: boolean;
}

/**
 * Application Decision Payload (landlord action)
 */
export interface ApplicationDecisionPayload {
  decision: 'approve' | 'deny' | 'conditional';
  optional_message?: string;
  denial_reason?: string; // Required if decision = 'deny'
  compliance_confirmed?: boolean; // Required if decision = 'deny'
}

/**
 * Public Status Response (no auth required, for applicants)
 */
export interface PublicApplicationStatusResponse {
  tracking_id: string;
  status: ApplicationStatus;
  status_timeline: {
    step: 'submitted' | 'under_review' | 'decision';
    completed: boolean;
    timestamp?: string;
  }[];
  decision?: 'approved' | 'denied' | 'pending';
  message?: string; // Generic message (no AI details)
}
