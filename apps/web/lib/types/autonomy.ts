/**
 * Autonomy Module Types and Interfaces
 * Defines all TypeScript types for autonomous decision-making feature.
 */

/** Valid types of autonomous decisions */
export enum DecisionType {
  DISPATCH = "dispatch",
  ESCALATE = "escalate",
  HOLD = "hold",
}

/** Status of an autonomous decision */
export enum DecisionStatus {
  PENDING_REVIEW = "pending_review",
  CONFIRMED = "confirmed",
  OVERRIDDEN = "overridden",
}

/**
 * Landlord autonomy settings and preferences
 * Controls how aggressively the AI makes autonomous decisions
 */
export interface AutonomySettings {
  id: string;
  landlord_id: string;
  confidence_threshold: number; // 0-1, default 0.85
  per_decision_cap: number; // default $500
  monthly_cap: number; // default $5000
  excluded_categories: string[]; // Categories AI cannot auto-dispatch
  preferred_vendors_only: boolean; // default false
  require_cost_estimate: boolean; // default true
  emergency_auto_dispatch: boolean; // default true
  rollback_window_hours: number; // default 24 hours
  paused: boolean; // default false
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Breakdown of factors contributing to confidence score
 * Each factor is weighted 0-1 based on available data
 */
export interface ConfidenceFactors {
  historical_weight: number; // How much landlord's past decisions influence score
  rules_weight: number; // How much existing rules support the decision
  cost_weight: number; // How much cost is within comfort zone
  vendor_weight: number; // How much vendor reputation/history supports dispatch
  category_weight: number; // How much category patterns support dispatch
}

/**
 * Results of all safety checks for a decision
 * AI only acts if all required checks pass
 */
export interface SafetyChecks {
  spending_cap_ok: boolean; // Cost is within per-decision and monthly caps
  category_excluded: boolean; // Category is not in landlord's exclusion list
  vendor_available: boolean; // Vendor is available for this request
  emergency_eligible: boolean; // If emergency, landlord allows emergency auto-dispatch
}

/**
 * Actions taken by autonomous decision (for audit trail)
 * Records all side-effects of the decision
 */
export interface ActionsTaken {
  vendor_dispatched?: {
    vendor_id: string;
    vendor_name: string;
  };
  notifications_sent?: {
    recipient: "landlord" | "tenant" | "vendor";
    method: "email" | "sms" | "in_app";
  }[];
  maintenance_request_status_changed?: string; // New status
}

/**
 * Complete autonomous decision record
 * Audit trail for all AI-made decisions
 */
export interface AutonomousDecision {
  id: string;
  request_id: string;
  landlord_id: string;
  decision_type: DecisionType;
  confidence_score: number; // 0-1
  reasoning: string; // Human-readable explanation
  factors: ConfidenceFactors;
  safety_checks: SafetyChecks;
  actions_taken: ActionsTaken;
  status: DecisionStatus;
  reviewed_at?: string; // ISO 8601
  review_action?: "confirmed" | "overridden";
  review_notes?: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Monthly aggregate statistics for autonomous decisions
 * Calculated from autonomous_decisions table
 */
export interface AutonomyMonthlyStats {
  id: string;
  landlord_id: string;
  month: string; // First day of month (YYYY-MM-01)
  total_decisions: number;
  auto_dispatched: number;
  escalated: number;
  overridden: number;
  total_spend: number;
  trust_score?: number; // 0-1, based on override rate
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Distribution of confidence scores for a month
 * Shows how many decisions fell into each confidence range
 */
export interface ConfidenceDistribution {
  range_0_50: number; // 0-0.5
  range_50_70: number; // 0.5-0.7
  range_70_85: number; // 0.7-0.85
  range_85_100: number; // 0.85-1.0
}

/**
 * Spending breakdown by maintenance category
 */
export interface SpendingByCategory {
  [category: string]: number; // category name => total spend
}

/**
 * Decision count breakdown by maintenance category
 */
export interface DecisionsByCategory {
  [category: string]: {
    auto_dispatched: number;
    escalated: number;
    overridden: number;
  };
}

/**
 * AI recommendation for monthly autonomy settings
 * Based on performance data and trust patterns
 */
export interface AiRecommendation {
  suggestion: string; // Human-readable recommendation
  reasoning: string; // Why this recommendation
  suggested_threshold?: number; // Suggested confidence_threshold adjustment
  suggested_spending_limit?: number; // Suggested per_decision_cap adjustment
}

/**
 * Comprehensive monthly report for autonomy feature
 * Combines stats with detailed analysis
 */
export interface AutonomyMonthlyReport {
  month: string; // YYYY-MM-01 format
  stats: AutonomyMonthlyStats;
  spending_by_category: SpendingByCategory;
  decisions_by_category: DecisionsByCategory;
  confidence_distribution: ConfidenceDistribution;
  ai_recommendation: AiRecommendation;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
