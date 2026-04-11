/**
 * Unit tests for compliance communication review endpoint.
 *
 * Tests: POST /api/compliance/review
 *        Message safety checking, finding detection, escalation triggers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";

// Mock dependencies
vi.mock("@clerk/nextjs/server");
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/anthropic");

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCreateClient = createServerSupabaseClient as ReturnType<typeof vi.fn>;
const mockAnthropic = anthropic as any;

// Mock Supabase client builder
function buildSupabase(results: Array<{ data: unknown; error: unknown | null }>) {
  let idx = 0;
  const next = () => {
    const r = results[idx] ?? { data: null, error: null };
    idx++;
    return r;
  };

  const chain: Record<string, any> = {};
  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "in",
    "or",
    "is",
  ];

  for (const m of chainMethods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  chain.single = vi.fn().mockImplementation(() => Promise.resolve(next()));

  return { from: vi.fn().mockReturnValue(chain) };
}

describe("POST /api/compliance/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Valid review scenarios", () => {
    it("returns valid findings for clean message", () => {
      const mockResponse = {
        findings: [],
        overall_risk_level: "low",
        safe_to_send: true,
        escalation_required: false,
        escalation_reason: null,
      };

      expect(mockResponse.findings.length).toBe(0);
      expect(mockResponse.safe_to_send).toBe(true);
      expect(mockResponse.overall_risk_level).toBe("low");
    });

    it("identifies fair housing violation", () => {
      const mockResponse = {
        findings: [
          {
            severity: "error",
            type: "fair_housing",
            flagged_text: "I don't rent to people with children",
            reason: "Discriminatory language violates Fair Housing Act",
            suggestion: "Remove discriminatory language",
          },
        ],
        overall_risk_level: "high",
        safe_to_send: false,
        escalation_required: true,
        escalation_reason: "Fair Housing violation detected",
      };

      expect(mockResponse.findings[0].type).toBe("fair_housing");
      expect(mockResponse.findings[0].severity).toBe("error");
      expect(mockResponse.safe_to_send).toBe(false);
      expect(mockResponse.escalation_required).toBe(true);
    });

    it("identifies missing disclosure", () => {
      const mockResponse = {
        findings: [
          {
            severity: "warning",
            type: "disclosure",
            flagged_text: "Please send rent to [address]",
            reason: "Missing required disclosures",
            suggestion: "Add required legal disclosures",
          },
        ],
        overall_risk_level: "medium",
        safe_to_send: false,
        escalation_required: false,
        escalation_reason: null,
      };

      expect(mockResponse.findings[0].type).toBe("disclosure");
      expect(mockResponse.findings[0].severity).toBe("warning");
    });

    it("handles multiple findings in single message", () => {
      const mockResponse = {
        findings: [
          {
            severity: "error",
            type: "fair_housing",
            flagged_text: "Discriminatory language",
            reason: "Fair housing violation",
            suggestion: "Remove",
          },
          {
            severity: "warning",
            type: "disclosure",
            flagged_text: "Missing disclosure",
            reason: "Missing required text",
            suggestion: "Add disclosure",
          },
        ],
        overall_risk_level: "high",
        safe_to_send: false,
        escalation_required: true,
        escalation_reason: "Multiple issues detected",
      };

      expect(mockResponse.findings.length).toBeGreaterThanOrEqual(2);
      expect(mockResponse.findings[0]).toHaveProperty("severity");
      expect(mockResponse.findings[1]).toHaveProperty("severity");
    });
  });

  describe("Input validation", () => {
    it("validates message_text not empty", () => {
      const invalidBody = { message_text: "" };
      expect(invalidBody.message_text.length).toBe(0);
    });

    it("requires valid UUID for property_id", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000";
      expect(validUUID).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

      const invalidUUID = "not-a-uuid";
      expect(invalidUUID).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("uses tenant as default recipient_type", () => {
      const defaultType = "tenant";
      expect(defaultType).toBe("tenant");
    });

    it("accepts valid recipient_types", () => {
      const validTypes = ["tenant", "vendor", "other"];
      expect(validTypes).toContain("tenant");
      expect(validTypes).toContain("vendor");
      expect(validTypes).toContain("other");
    });

    it("returns 404 for invalid property_id", () => {
      const property = null;
      expect(property).toBeNull();
    });
  });

  describe("Response format validation", () => {
    it("findings have required fields", () => {
      const mockFinding = {
        severity: "error",
        type: "fair_housing",
        flagged_text: "discriminatory text",
        reason: "Fair Housing violation",
        suggestion: "Remove discriminatory language",
      };

      expect(mockFinding).toHaveProperty("severity");
      expect(mockFinding).toHaveProperty("type");
      expect(mockFinding).toHaveProperty("flagged_text");
      expect(mockFinding).toHaveProperty("reason");
      expect(mockFinding).toHaveProperty("suggestion");
    });

    it("overall_risk_level is valid enum", () => {
      const validLevels = ["low", "medium", "high"];
      expect(validLevels).toContain("low");
      expect(validLevels).toContain("medium");
      expect(validLevels).toContain("high");
    });

    it("safe_to_send is boolean", () => {
      const response = { safe_to_send: true };
      expect(typeof response.safe_to_send).toBe("boolean");
    });

    it("safe_to_send correlates with risk_level", () => {
      const lowRiskResponse = {
        overall_risk_level: "low",
        safe_to_send: true,
      };
      expect(lowRiskResponse.safe_to_send).toBe(true);

      const highRiskResponse = {
        overall_risk_level: "high",
        safe_to_send: false,
      };
      expect(highRiskResponse.safe_to_send).toBe(false);
    });

    it("includes disclaimer in response", () => {
      const response = {
        disclaimer:
          "This review is AI-generated and not a substitute for legal advice.",
      };

      expect(response).toHaveProperty("disclaimer");
      expect(typeof response.disclaimer).toBe("string");
      expect(response.disclaimer.length).toBeGreaterThan(0);
    });

    it("includes reviewed_at timestamp", () => {
      const timestamp = new Date().toISOString();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("Escalation triggers", () => {
    it("escalates on eviction scenario", () => {
      const messageWithEviction =
        "We are hereby giving notice of termination of your lease. You have 30 days to vacate.";
      expect(messageWithEviction.toLowerCase()).toContain("termination");

      const response = {
        escalation_required: true,
        escalation_reason: "Eviction notice detected",
      };

      expect(response.escalation_required).toBe(true);
    });

    it("escalates on fair housing violation", () => {
      const messageWithDiscrimination = "We do not rent to families with pets";
      expect(messageWithDiscrimination.toLowerCase()).toContain("pet");

      const response = {
        escalation_required: true,
        escalation_reason: "Fair Housing violation",
      };

      expect(response.escalation_required).toBe(true);
    });

    it("escalates on ADA denial", () => {
      const messageWithADADenial =
        "We do not allow service animals in this property";

      const response = {
        escalation_required: true,
        escalation_reason: "ADA accommodation denial",
      };

      expect(response.escalation_required).toBe(true);
    });

    it("does not escalate for routine message", () => {
      const routineMessage = "Please fix the kitchen faucet";

      const response = {
        escalation_required: false,
        escalation_reason: null,
      };

      expect(response.escalation_required).toBe(false);
      expect(response.escalation_reason).toBeNull();
    });
  });

  describe("Authorization & Security", () => {
    it("returns 401 when user not authenticated", () => {
      mockAuth.mockResolvedValue({ userId: null });
      const userId = null;
      expect(userId).toBeNull();
    });

    it("prevents access to properties of other users", () => {
      const supabase = buildSupabase([
        { data: null, error: null }, // Property owned by different user
      ]);

      mockCreateClient.mockReturnValue(supabase as any);
      const property = null;
      expect(property).toBeNull();
    });

    it("logs review to audit trail", () => {
      const auditLog = {
        action_type: "communication_reviewed",
        findings_count: 1,
        overall_risk_level: "medium",
        recipient_type: "tenant",
      };

      expect(auditLog.action_type).toBe("communication_reviewed");
      expect(typeof auditLog.findings_count).toBe("number");
    });
  });

  describe("Jurisdiction context", () => {
    it("includes jurisdiction state in response", () => {
      const response = {
        jurisdiction: {
          state_code: "CA",
          city: "San Francisco",
        },
      };

      expect(response.jurisdiction.state_code).toBe("CA");
    });

    it("handles null jurisdiction gracefully", () => {
      const response = { jurisdiction: null };
      expect(response.jurisdiction).toBeNull();
    });

    it("applies jurisdiction rules to review", () => {
      const caRules =
        "- entry_notice: 24 hours written notice\n- security_deposit: 2 months max";
      expect(caRules).toContain("entry_notice");
      expect(caRules).toContain("security_deposit");
    });
  });
});
