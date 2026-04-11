/**
 * Test fixtures and mock data for compliance engine tests.
 *
 * Provides reusable mock data:
 *   - Jurisdiction rules
 *   - Property data
 *   - Checklist items
 *   - Helper functions
 */

// ============================================================================
// Jurisdiction Rules Fixtures
// ============================================================================

export const mockJurisdictionRules = {
  CA_STATEWIDE: [
    {
      id: "ca-1",
      state_code: "CA",
      city: null,
      topic: "entry_notice",
      rule_text: "Landlord must give 24 hours written notice before entry.",
      statute_citation: "CA Civil Code § 1954",
      required_days: 1,
    },
    {
      id: "ca-2",
      state_code: "CA",
      city: null,
      topic: "security_deposit",
      rule_text: "Security deposit cannot exceed two months of rent.",
      statute_citation: "CA Civil Code § 1950.5",
      required_days: null,
    },
    {
      id: "ca-3",
      state_code: "CA",
      city: null,
      topic: "lease_renewal",
      rule_text: "Landlord must provide notice 90 days before lease end.",
      statute_citation: "CA Civil Code § 1954.535",
      required_days: 90,
    },
  ],

  SF_SPECIFIC: [
    {
      id: "sf-1",
      state_code: "CA",
      city: "San Francisco",
      topic: "entry_notice",
      rule_text:
        "Landlord must give 72 hours written notice before entry (SF override).",
      statute_citation: "SF Administrative Code § 37.9",
      required_days: 3,
    },
    {
      id: "sf-2",
      state_code: "CA",
      city: "San Francisco",
      topic: "rent_increase",
      rule_text:
        "Rent increase limited to annual inflation adjustment per SF Rent Control.",
      statute_citation: "SF Administrative Code Chapter 37",
      required_days: 60,
    },
  ],

  NY_STATEWIDE: [
    {
      id: "ny-1",
      state_code: "NY",
      city: null,
      topic: "entry_notice",
      rule_text: "Landlord must give 24 hours notice before entry.",
      statute_citation: "NY Real Property Law § 235-f",
      required_days: 1,
    },
    {
      id: "ny-2",
      state_code: "NY",
      city: null,
      topic: "security_deposit",
      rule_text: "Security deposit is limited to one month's rent.",
      statute_citation: "NY General Obligations Law § 7-103",
      required_days: null,
    },
  ],
};

// ============================================================================
// Property Fixtures
// ============================================================================

export const mockProperties = {
  CA_SF: {
    id: "prop-ca-sf",
    landlord_id: "landlord-1",
    address: "123 Main St, San Francisco, CA 94102",
    jurisdiction: {
      state_code: "CA",
      city: "San Francisco",
    },
  },

  CA_STATEWIDE: {
    id: "prop-ca-statewide",
    landlord_id: "landlord-1",
    address: "456 Oak Ave, Los Angeles, CA 90001",
    jurisdiction: {
      state_code: "CA",
      city: null,
    },
  },

  NY: {
    id: "prop-ny",
    landlord_id: "landlord-1",
    address: "789 Broadway, New York, NY 10003",
    jurisdiction: {
      state_code: "NY",
      city: null,
    },
  },

  NO_JURISDICTION: {
    id: "prop-no-jurisdiction",
    landlord_id: "landlord-1",
    address: "999 Unknown St, Nowhere, XX 00000",
    jurisdiction: null,
  },
};

// ============================================================================
// Checklist Items Fixtures
// ============================================================================

export const mockChecklistItems = {
  CA_SF_PARTIAL: [
    {
      id: "item-1",
      property_id: "prop-ca-sf",
      topic: "entry_notice",
      description: "72 hours notice required (SF override)",
      completed: true,
      completed_at: "2026-04-05T10:00:00Z",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-05T10:00:00Z",
    },
    {
      id: "item-2",
      property_id: "prop-ca-sf",
      topic: "security_deposit",
      description: "Cannot exceed two months rent",
      completed: false,
      completed_at: null,
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    },
    {
      id: "item-3",
      property_id: "prop-ca-sf",
      topic: "rent_increase",
      description: "Rent increase limited to annual inflation",
      completed: false,
      completed_at: null,
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    },
  ],

  CA_SF_COMPLETE: [
    {
      id: "item-4",
      property_id: "prop-ca-sf",
      topic: "entry_notice",
      description: "72 hours notice required",
      completed: true,
      completed_at: "2026-04-02T10:00:00Z",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-02T10:00:00Z",
    },
    {
      id: "item-5",
      property_id: "prop-ca-sf",
      topic: "security_deposit",
      description: "Cannot exceed two months rent",
      completed: true,
      completed_at: "2026-04-03T10:00:00Z",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-03T10:00:00Z",
    },
    {
      id: "item-6",
      property_id: "prop-ca-sf",
      topic: "rent_increase",
      description: "Rent increase limited to annual inflation",
      completed: true,
      completed_at: "2026-04-04T10:00:00Z",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-04T10:00:00Z",
    },
  ],

  EMPTY: [],
};

// ============================================================================
// Test Data Builders
// ============================================================================

/**
 * Create a mock property with default jurisdiction
 */
export function createMockProperty(
  overrides?: Partial<typeof mockProperties.CA_SF>
) {
  return {
    ...mockProperties.CA_SF,
    ...overrides,
  };
}

/**
 * Create mock checklist items for a property
 */
export function createMockChecklistItems(count: number, completed: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    property_id: "prop-test",
    topic: `topic_${i}`,
    description: `Requirement ${i}`,
    completed: i < completed,
    completed_at: i < completed ? "2026-04-01T10:00:00Z" : null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  }));
}

/**
 * Create mock jurisdiction rules for a state
 */
export function createMockRules(stateCode: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `rule-${stateCode}-${i}`,
    state_code: stateCode,
    city: null,
    topic: `topic_${i}`,
    rule_text: `Rule ${i} for ${stateCode}`,
    statute_citation: `${stateCode} Code § ${1000 + i}`,
    required_days: i % 2 === 0 ? i + 1 : null,
  }));
}

/**
 * Calculate expected score from completion counts
 */
export function expectedScore(
  completedCount: number,
  totalRequired: number
): number {
  if (totalRequired === 0) return 0;
  return Math.round((completedCount / totalRequired) * 100);
}

/**
 * Build mock API response for compliance score
 */
export function buildMockScoreResponse(propertyId: string, score: number) {
  return {
    property_id: propertyId,
    score,
    completed_count: Math.floor((score / 100) * 4),
    total_required_count: 4,
    missing_items: [
      { topic: "missing_1", description: "First missing item" },
      { topic: "missing_2", description: "Second missing item" },
    ],
    calculated_at: new Date().toISOString(),
  };
}
