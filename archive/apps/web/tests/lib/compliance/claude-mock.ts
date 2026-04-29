/**
 * Mock utilities for Claude API responses in compliance tests.
 *
 * Provides mocking for:
 *   - Review API responses (findings, risk levels, escalations)
 *   - Notice generation responses (notices, citations, period days)
 *   - Error scenarios (timeouts, rate limits, invalid JSON)
 */
import { vi } from "vitest";

// ============================================================================
// Review API Mocks
// ============================================================================

export const mockClaudeReviewResponses = {
  cleanMessage: {
    findings: [],
    overall_risk_level: "low" as const,
    safe_to_send: true,
    escalation_required: false,
    escalation_reason: null,
  },

  fairHousingViolation: {
    findings: [
      {
        severity: "error" as const,
        type: "fair_housing" as const,
        flagged_text: "I don't rent to people with children",
        reason:
          "Discriminatory language that violates the Fair Housing Act. Family status is a protected class.",
        suggestion:
          "Remove all discriminatory language and focus on property-specific rules.",
      },
    ],
    overall_risk_level: "high" as const,
    safe_to_send: false,
    escalation_required: true,
    escalation_reason: "Fair Housing violation requires legal review",
  },

  missingDisclosure: {
    findings: [
      {
        severity: "warning" as const,
        type: "disclosure" as const,
        flagged_text: "Please send rent to 123 Main Street",
        reason:
          "Message does not include required legal disclosures for California properties",
        suggestion:
          "Add required disclosures about lead paint, mold, and other hazards",
      },
    ],
    overall_risk_level: "medium" as const,
    safe_to_send: false,
    escalation_required: false,
    escalation_reason: null,
  },

  multipleFindings: {
    findings: [
      {
        severity: "error" as const,
        type: "fair_housing" as const,
        flagged_text: "No families with pets allowed",
        reason: "Discriminatory restriction",
        suggestion: "Remove discriminatory language",
      },
      {
        severity: "warning" as const,
        type: "disclosure" as const,
        flagged_text: "Pay rent on time",
        reason: "Missing required legal disclosures",
        suggestion: "Add required disclosures",
      },
    ],
    overall_risk_level: "high" as const,
    safe_to_send: false,
    escalation_required: true,
    escalation_reason: "Multiple compliance issues detected",
  },

  evictionScenario: {
    findings: [
      {
        severity: "error" as const,
        type: "notice_language" as const,
        flagged_text:
          "We are terminating your lease. You have 30 days to vacate.",
        reason: "Eviction notices require specific legal language and procedure",
        suggestion: "Consult legal counsel for proper eviction notice format",
      },
    ],
    overall_risk_level: "high" as const,
    safe_to_send: false,
    escalation_required: true,
    escalation_reason: "Eviction notice requires legal review",
  },

  adaViolation: {
    findings: [
      {
        severity: "error" as const,
        type: "fair_housing" as const,
        flagged_text: "We do not allow service animals",
        reason: "Violates ADA reasonable accommodation requirements",
        suggestion:
          "Remove restriction. Service animals are legally required accommodations.",
      },
    ],
    overall_risk_level: "high" as const,
    safe_to_send: false,
    escalation_required: true,
    escalation_reason: "ADA violation requires immediate legal review",
  },
};

// ============================================================================
// Notice Generation Mocks
// ============================================================================

export const mockClaudeNoticeResponses = {
  entryNotice: {
    notice_text: `Date: 2026-04-10

Dear John Doe,

This letter is to provide 72-hour written notice of entry to the property at 123 Main Street, San Francisco, CA 94102.

We intend to enter the property on 2026-04-13 at 10:00 AM for the purpose of maintenance inspection.

California Civil Code § 1954 requires landlords to provide reasonable notice (24 hours in most cases, 72 hours in San Francisco) before entering a rental property.

Please ensure someone is present at the property during this time, or contact us to reschedule.

Sincerely,
Property Management`,
    statutory_citations: ["CA Civil Code § 1954", "SF Administrative Code § 37.9"],
    notice_period_days: 3,
  },

  leaseViolationNotice: {
    notice_text: `Date: 2026-04-10

Dear John Doe,

This letter is to notify you of a lease violation at the property located at 123 Main Street, San Francisco, CA 94102.

VIOLATION: Unauthorized pet on property. Your lease explicitly prohibits pets without written landlord approval.

CURE PERIOD: You have 3 days from the date of this letter to remedy this violation by removing the animal.

If this violation is not cured within the specified period, we will proceed with lease termination proceedings.

Sincerely,
Property Management`,
    statutory_citations: ["CA Civil Code § 1951.7"],
    notice_period_days: 3,
  },

  rentIncreaseNotice: {
    notice_text: `Date: 2026-04-10

Dear John Doe,

This letter is to notify you of a rent increase for the property at 123 Main Street, San Francisco, CA 94102.

CURRENT MONTHLY RENT: $2,000
NEW MONTHLY RENT: $2,100
EFFECTIVE DATE: 2026-06-01

This rent increase is effective 60 days from the date of this notice, as required by law.

Please ensure all future rent payments reflect the new amount.

Sincerely,
Property Management`,
    statutory_citations: ["CA Civil Code § 1947.2", "CA Civil Code § 1954.535"],
    notice_period_days: 60,
  },

  evictionNotice: {
    notice_text: `Date: 2026-04-10

Dear John Doe,

NOTICE OF LEASE TERMINATION

This letter is to provide notice that your tenancy at 123 Main Street, San Francisco, CA 94102 is terminated effective 2026-05-10.

REASON: Non-payment of rent for the month of April 2026.

You are required to vacate the property on or before the effective date above and return all keys. The property must be in clean condition with no outstanding damages.

This notice is provided in accordance with California Civil Code § 1946 and San Francisco Administrative Code requirements.

Sincerely,
Property Management`,
    statutory_citations: ["CA Civil Code § 1946", "CA Civil Code § 1950"],
    notice_period_days: 30,
  },
};

// ============================================================================
// Error Scenario Mocks
// ============================================================================

export const mockClaudeErrors = {
  timeout: new Error("Claude API request timeout after 30 seconds"),
  rateLimit: {
    status: 429,
    message: "Too many requests. Please try again later.",
  },
  invalidJson: "This is not valid JSON {invalid}",
  emptyResponse: "",
  malformedResponse: {
    // Missing required fields
    findings: [],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a mock Claude response for review API
 */
export function createMockReviewResponse(
  overrides?: Partial<(typeof mockClaudeReviewResponses)["cleanMessage"]>
) {
  return {
    ...mockClaudeReviewResponses.cleanMessage,
    ...overrides,
  };
}

/**
 * Create a mock Claude response for notice generation API
 */
export function createMockNoticeResponse(
  overrides?: Partial<(typeof mockClaudeNoticeResponses)["entryNotice"]>
) {
  return {
    ...mockClaudeNoticeResponses.entryNotice,
    ...overrides,
  };
}

/**
 * Create a mock Anthropic messages.create function
 */
export function createMockAnthropicCreate(
  response: unknown = mockClaudeReviewResponses.cleanMessage
) {
  return vi.fn().mockResolvedValue({
    content: [
      {
        type: "text",
        text: JSON.stringify(response),
      },
    ],
  });
}

/**
 * Create a mock that simulates Claude API timeout
 */
export function createMockAnthropicTimeout() {
  return vi.fn().mockRejectedValue(mockClaudeErrors.timeout);
}

/**
 * Create a mock that simulates rate limit error
 */
export function createMockAnthropicRateLimit() {
  return vi.fn().mockRejectedValue(mockClaudeErrors.rateLimit);
}

/**
 * Create a mock that returns invalid JSON
 */
export function createMockAnthropicInvalidJson() {
  return vi.fn().mockResolvedValue({
    content: [
      {
        type: "text",
        text: mockClaudeErrors.invalidJson,
      },
    ],
  });
}

/**
 * Create a mock that returns empty response
 */
export function createMockAnthropicEmptyResponse() {
  return vi.fn().mockResolvedValue({
    content: [
      {
        type: "text",
        text: mockClaudeErrors.emptyResponse,
      },
    ],
  });
}
