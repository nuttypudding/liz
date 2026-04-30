/**
 * Unit tests for compliance prompt builders.
 *
 * Scenarios covered:
 *   - Review prompt: clean message, fair housing violation, improper notice, eviction, ADA, missing disclosure
 *   - Notice prompt: entry, lease_violation, rent_increase, eviction
 *   - Jurisdiction context injection
 *   - Escalation trigger language presence
 *   - Output format specifications (JSON structure)
 *   - Disclaimers included
 *   - Statute citations requested
 */
import { describe, it, expect } from "vitest";
import {
  buildReviewPrompt,
  buildNoticePrompt,
  PROMPT_VERSION,
  ESCALATION_TRIGGERS,
} from "@/lib/compliance/prompts";

const CA_JURISDICTION = { state_code: "CA", city: "San Francisco" };
const NY_JURISDICTION = { state_code: "NY", city: null };

const CA_RULES =
  "- security_deposit_limit: Security deposit cannot exceed 2 months rent. CA Civil Code § 1950.5\n" +
  "- entry_notice: Landlord must give 24 hours written notice before entry. CA Civil Code § 1954";

describe("PROMPT_VERSION", () => {
  it("is defined as a non-empty string", () => {
    expect(typeof PROMPT_VERSION).toBe("string");
    expect(PROMPT_VERSION.length).toBeGreaterThan(0);
  });
});

describe("ESCALATION_TRIGGERS", () => {
  it("includes eviction, fair housing, and ADA", () => {
    const triggers = ESCALATION_TRIGGERS.join(" ");
    expect(triggers).toContain("eviction");
    expect(triggers).toContain("fair housing");
    expect(triggers).toContain("ADA");
  });
});

describe("buildReviewPrompt", () => {
  it("includes the message text", () => {
    const msg = "You need to pay rent by Friday or you will be removed.";
    const prompt = buildReviewPrompt(msg, CA_JURISDICTION, CA_RULES, "tenant");
    expect(prompt).toContain(msg);
  });

  it("includes state and city from jurisdiction", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, CA_RULES, "tenant");
    expect(prompt).toContain("CA");
    expect(prompt).toContain("San Francisco");
  });

  it("handles null jurisdiction gracefully", () => {
    const prompt = buildReviewPrompt("test", null, "", "tenant");
    expect(prompt).toContain("Jurisdiction: not configured");
  });

  it("includes jurisdiction without city", () => {
    const prompt = buildReviewPrompt("test", NY_JURISDICTION, "", "vendor");
    expect(prompt).toContain("State: NY");
    expect(prompt).not.toContain("City:");
  });

  it("includes rules context when provided", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, CA_RULES, "tenant");
    expect(prompt).toContain("security_deposit_limit");
    expect(prompt).toContain("CA Civil Code § 1950.5");
  });

  it("omits rules section when rulesContext is empty", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, "", "tenant");
    expect(prompt).not.toContain("Applicable Jurisdiction Rules");
  });

  it("includes recipient type", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, "", "vendor");
    expect(prompt).toContain("vendor");
  });

  it("specifies JSON output format with all required fields", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, CA_RULES, "tenant");
    expect(prompt).toContain('"findings"');
    expect(prompt).toContain('"overall_risk_level"');
    expect(prompt).toContain('"safe_to_send"');
    expect(prompt).toContain('"escalation_required"');
    expect(prompt).toContain('"escalation_reason"');
  });

  it("specifies finding fields in output format", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, CA_RULES, "tenant");
    expect(prompt).toContain('"severity"');
    expect(prompt).toContain('"type"');
    expect(prompt).toContain('"flagged_text"');
    expect(prompt).toContain('"reason"');
    expect(prompt).toContain('"suggestion"');
  });

  it("includes escalation trigger scenarios", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, CA_RULES, "tenant");
    expect(prompt).toContain("eviction");
    expect(prompt).toContain("fair housing");
    expect(prompt).toContain("ADA");
  });

  it("instructs JSON-only output (no markdown)", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, CA_RULES, "tenant");
    expect(prompt).toMatch(/no markdown/i);
  });

  it("instructs empty findings for clean messages", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, CA_RULES, "tenant");
    expect(prompt).toContain("no issues are found");
  });

  // Scenario-specific content checks

  it("covers fair housing violations in instructions", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, "", "tenant");
    expect(prompt).toContain("Fair housing");
    expect(prompt).toContain("protected class");
  });

  it("covers improper notice language in instructions", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, "", "tenant");
    expect(prompt).toContain("notice");
    expect(prompt).toContain("disclosure");
  });

  it("covers liability risks in instructions", () => {
    const prompt = buildReviewPrompt("test", CA_JURISDICTION, "", "tenant");
    expect(prompt).toContain("Liability");
    expect(prompt).toContain("illegal");
  });
});

describe("buildNoticePrompt", () => {
  const context = "Tenant name: Jane Doe\nIssue/reason: Scheduled maintenance\nProposed date: 2026-04-15";

  it("includes notice type in the prompt", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toContain("entry notice");
  });

  it("replaces underscores in notice type", () => {
    const prompt = buildNoticePrompt("lease_violation", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toContain("lease violation notice");
  });

  it("includes jurisdiction state and city", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toContain("CA");
    expect(prompt).toContain("San Francisco");
  });

  it("includes jurisdiction without city", () => {
    const prompt = buildNoticePrompt("entry", NY_JURISDICTION, "", context);
    expect(prompt).toContain("NY");
    expect(prompt).not.toContain(", null");
  });

  it("includes jurisdiction rules when provided", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toContain("CA Civil Code § 1954");
    expect(prompt).toContain("entry_notice");
  });

  it("shows fallback when no rules", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, "", context);
    expect(prompt).toContain("No specific rules found");
  });

  it("includes the context lines", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toContain("Jane Doe");
    expect(prompt).toContain("Scheduled maintenance");
  });

  it("requests statute citations in output", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toContain('"statutory_citations"');
  });

  it("requests notice_period_days in output", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toContain('"notice_period_days"');
  });

  it("specifies JSON output with notice_text field", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toContain('"notice_text"');
  });

  it("includes attorney review disclaimer in requirements", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toContain("legal professional");
  });

  it("adds eviction-specific attorney note for eviction notices", () => {
    const prompt = buildNoticePrompt("eviction", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toContain("eviction");
    expect(prompt).toContain("attorney review");
  });

  it("does not add eviction note for non-eviction notices", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, CA_RULES, context);
    // Should not contain the special eviction escalation block
    expect(prompt).not.toContain("strongly recommended before serving");
  });

  it("instructs JSON-only output (no markdown)", () => {
    const prompt = buildNoticePrompt("entry", CA_JURISDICTION, CA_RULES, context);
    expect(prompt).toMatch(/no markdown/i);
  });

  it("handles rent_increase notice type", () => {
    const rentContext = "Tenant name: John Smith\nRent increase amount: $200\nEffective date: 2026-06-01";
    const prompt = buildNoticePrompt("rent_increase", CA_JURISDICTION, CA_RULES, rentContext);
    expect(prompt).toContain("rent increase notice");
    expect(prompt).toContain("$200");
  });
});
