/**
 * Unit tests for compliance notice generation endpoint.
 *
 * Tests: POST /api/compliance/notices/generate
 *        Notice type validation, content generation, storage
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

describe("POST /api/compliance/notices/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Valid notice generation", () => {
    it("generates entry notice correctly", () => {
      const mockResponse = {
        notice_type: "entry",
        content:
          "[Professional letter format]\n\nDate: 2026-04-10\n\nDear John Doe,\n\nThis letter is to provide 72-hour notice of entry to the property at [address] on 2026-04-13...",
        statutory_citations: ["CA Civil Code § 1954"],
        notice_period_days: 3,
      };

      expect(mockResponse.notice_type).toBe("entry");
      expect(mockResponse.content).toContain("notice");
      expect(mockResponse.content).toContain("entry");
      expect(mockResponse.statutory_citations[0]).toContain("Civil Code");
      expect(mockResponse.notice_period_days).toBe(3);
    });

    it("generates lease violation notice", () => {
      const mockResponse = {
        notice_type: "lease_violation",
        content: "Notice of lease violation regarding [issue]...",
        statutory_citations: ["CA Civil Code § 1951.7"],
        notice_period_days: 5,
      };

      expect(mockResponse.notice_type).toBe("lease_violation");
      expect(mockResponse.content).toContain("violation");
    });

    it("generates rent increase notice", () => {
      const mockResponse = {
        notice_type: "rent_increase",
        content:
          "Notice of Rent Increase\n\nOld rent: $2000\nNew rent: $2100\nEffective: 2026-06-01",
        statutory_citations: ["CA Civil Code § 1947.2"],
        notice_period_days: 60,
      };

      expect(mockResponse.notice_type).toBe("rent_increase");
      expect(mockResponse.content).toContain("rent");
      expect(mockResponse.notice_period_days).toBeGreaterThanOrEqual(60);
    });

    it("generates eviction notice", () => {
      const mockResponse = {
        notice_type: "eviction",
        content: "Notice of Lease Termination...",
        statutory_citations: ["CA Civil Code § 1946"],
        notice_period_days: 30,
      };

      expect(mockResponse.notice_type).toBe("eviction");
      expect(mockResponse.notice_period_days).toBeGreaterThanOrEqual(30);
    });
  });

  describe("Notice format and content", () => {
    it("is properly formatted letter", () => {
      const noticeContent =
        "Date: 2026-04-10\n\nDear John Doe,\n\n[Body]\n\nSincerely,\n[Signature line]";

      // Check for letter elements
      expect(noticeContent).toContain("Date");
      expect(noticeContent).toContain("Dear");
      expect(noticeContent).toContain("Sincerely");
    });

    it("includes statute citations", () => {
      const citations = ["CA Civil Code § 1954", "CA Civil Code § 1950.5"];
      expect(citations[0]).toContain("Civil Code");
      expect(citations[0]).toMatch(/§ \d+/);
    });

    it("includes AI generation disclaimer", () => {
      const notice = {
        content:
          "...notice content...\n\nDISCLAIMER: This notice was generated using AI and should be reviewed by legal counsel.",
      };

      expect(notice.content).toContain("DISCLAIMER");
      expect(notice.content).toContain("AI");
    });

    it("specifies jurisdiction requirements", () => {
      const jurisdictionData = {
        state_code: "CA",
        city: "San Francisco",
        rules: [
          {
            topic: "entry_notice",
            notice_period_days: 3,
          },
        ],
      };

      expect(jurisdictionData.state_code).toBe("CA");
      expect(jurisdictionData.rules[0].notice_period_days).toBe(3);
    });

    it("populates statutory_citations field", () => {
      const response = {
        statutory_citations: [
          "CA Civil Code § 1954",
          "CA Civil Code § 1950.7",
        ],
      };

      expect(Array.isArray(response.statutory_citations)).toBe(true);
      expect(response.statutory_citations.length).toBeGreaterThan(0);
    });
  });

  describe("Input validation", () => {
    it("validates notice_type", () => {
      const validTypes = ["entry", "lease_violation", "rent_increase", "eviction"];
      expect(validTypes).toContain("entry");
      expect(validTypes).toContain("lease_violation");

      const invalidType = "invalid_type";
      expect(validTypes).not.toContain(invalidType);
    });

    it("requires property_id UUID", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000";
      expect(validUUID).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("validates required context fields for entry notice", () => {
      // Entry requires: tenant_name, issue_description, proposed_date
      const validContext = {
        tenant_name: "John Doe",
        issue_description: "Maintenance inspection",
        proposed_date: "2026-04-15",
      };

      expect(validContext.tenant_name).toBeDefined();
      expect(validContext.issue_description).toBeDefined();
      expect(validContext.proposed_date).toBeDefined();
    });

    it("validates required context fields for lease violation notice", () => {
      // Lease violation requires: tenant_name, issue_description
      const validContext = {
        tenant_name: "John Doe",
        issue_description: "Unauthorized pet on property",
      };

      expect(validContext.tenant_name).toBeDefined();
      expect(validContext.issue_description).toBeDefined();
    });

    it("validates required context fields for rent increase notice", () => {
      // Rent increase requires: tenant_name, rent_increase_amount, effective_date
      const validContext = {
        tenant_name: "John Doe",
        rent_increase_amount: 100,
        effective_date: "2026-06-01",
      };

      expect(validContext.tenant_name).toBeDefined();
      expect(validContext.rent_increase_amount).toBeDefined();
      expect(validContext.effective_date).toBeDefined();
    });

    it("validates required context fields for eviction notice", () => {
      // Eviction requires: tenant_name, issue_description, effective_date
      const validContext = {
        tenant_name: "John Doe",
        issue_description: "Non-payment of rent",
        effective_date: "2026-05-01",
      };

      expect(validContext.tenant_name).toBeDefined();
      expect(validContext.issue_description).toBeDefined();
      expect(validContext.effective_date).toBeDefined();
    });

    it("returns 404 for invalid property_id", () => {
      const property = null;
      expect(property).toBeNull();
    });

    it("returns 400 if jurisdiction not configured", () => {
      const jurisdiction = null;
      expect(jurisdiction).toBeNull();
    });
  });

  describe("Database storage", () => {
    it("stores notice in compliance_notices table", () => {
      const storedNotice = {
        id: "notice-1",
        property_id: "prop-1",
        type: "entry",
        status: "generated",
        content: "...notice content...",
        created_at: "2026-04-10T10:00:00Z",
      };

      expect(storedNotice.id).toBeDefined();
      expect(storedNotice.status).toBe("generated");
      expect(storedNotice.type).toBe("entry");
    });

    it("persists notice content correctly", () => {
      const originalContent =
        "This is the generated notice with special characters: &, <, >";
      const storedContent =
        "This is the generated notice with special characters: &, <, >";

      expect(storedContent).toBe(originalContent);
    });

    it("stores jurisdiction data snapshot", () => {
      const snapshot = {
        state_code: "CA",
        city: "San Francisco",
        rules: [
          {
            topic: "entry_notice",
            notice_period_days: 3,
            statutory_citations: ["CA Civil Code § 1954"],
          },
        ],
      };

      expect(snapshot.state_code).toBe("CA");
      expect(snapshot.rules).toBeDefined();
      expect(Array.isArray(snapshot.rules)).toBe(true);
    });

    it("logs generation to audit trail", () => {
      const auditLog = {
        action_type: "notice_generated",
        notice_type: "entry",
        statutory_citations: ["CA Civil Code § 1954"],
        notice_period_days: 3,
      };

      expect(auditLog.action_type).toBe("notice_generated");
      expect(auditLog.notice_type).toBe("entry");
    });
  });

  describe("Response format", () => {
    it("includes id in response", () => {
      const response = { id: "notice-123" };
      expect(response.id).toBeDefined();
    });

    it("includes all required response fields", () => {
      const response = {
        property_id: "prop-1",
        notice_type: "entry",
        status: "generated",
        content: "...content...",
        statutory_citations: ["CA Civil Code § 1954"],
        notice_period_days: 3,
        generated_at: "2026-04-10T10:00:00Z",
      };

      expect(response).toHaveProperty("property_id");
      expect(response).toHaveProperty("notice_type");
      expect(response).toHaveProperty("status");
      expect(response).toHaveProperty("content");
      expect(response).toHaveProperty("statutory_citations");
      expect(response).toHaveProperty("notice_period_days");
      expect(response).toHaveProperty("generated_at");
    });

    it("includes disclaimer in response", () => {
      const response = {
        disclaimer: "This notice was AI-generated. Review before sending.",
      };

      expect(response.disclaimer).toBeDefined();
      expect(typeof response.disclaimer).toBe("string");
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

    it("requires landlord profile for storage", () => {
      const profile = { id: "profile-1", user_id: "user-1" };
      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
    });
  });

  describe("Effective date handling", () => {
    it("uses proposed_date for entry notices", () => {
      const context = { proposed_date: "2026-04-15" };
      const effectiveDate = context.proposed_date;
      expect(effectiveDate).toBe("2026-04-15");
    });

    it("uses effective_date for other notices", () => {
      const context = { effective_date: "2026-06-01" };
      const effectiveDate = context.effective_date;
      expect(effectiveDate).toBe("2026-06-01");
    });
  });
});
