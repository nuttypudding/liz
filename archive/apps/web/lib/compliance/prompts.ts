/**
 * Compliance AI prompt templates — v1.0
 *
 * These prompt builders inject jurisdiction-specific context into Claude prompts
 * for communication review and notice generation.
 *
 * Escalation triggers (either endpoint sets escalation_required: true when):
 *   - Eviction or lease termination
 *   - Fair housing violations (protected class discrimination)
 *   - ADA accommodation denial
 *   - Rent control violations
 *   - Retaliation scenarios
 *
 * Version history:
 *   v1.0 (2026-04-10) — Initial: review + notice prompts with escalation triggers,
 *                        jurisdiction context injection, structured JSON outputs.
 */

import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers";

export const PROMPT_VERSION = "v1.0";

/** Scenarios that always require attorney review / escalation */
export const ESCALATION_TRIGGERS = [
  "eviction or lease termination",
  "fair housing violation (protected class discrimination)",
  "ADA accommodation denial",
  "rent control violation",
  "retaliation scenario",
] as const;

type JurisdictionContext = {
  state_code: string;
  city?: string | null;
};

/**
 * Builds the communication review prompt for POST /api/compliance/review.
 * Returns a prompt string that asks Claude to return structured JSON.
 *
 * Output format (JSON):
 * {
 *   findings: [{ severity, type, flagged_text, reason, suggestion }],
 *   overall_risk_level: "low" | "medium" | "high",
 *   safe_to_send: boolean,
 *   escalation_required: boolean,
 *   escalation_reason: string | null
 * }
 *
 * @param messageText    - The landlord's message to review
 * @param jurisdiction   - State/city for jurisdiction context
 * @param rulesContext   - Pre-formatted jurisdiction rules text (empty string if none)
 * @param recipientType  - "tenant" | "vendor" | "other"
 */
export function buildReviewPrompt(
  messageText: string,
  jurisdiction: JurisdictionContext | null,
  rulesContext: string,
  recipientType: string
): string {
  const jurisdictionLine = jurisdiction
    ? `State: ${jurisdiction.state_code}${jurisdiction.city ? `\nCity: ${jurisdiction.city}` : ""}`
    : "Jurisdiction: not configured";

  const rulesSection = rulesContext
    ? `\n# Applicable Jurisdiction Rules\n${rulesContext}`
    : "";

  const escalationList = ESCALATION_TRIGGERS.map((t) => `  - ${t}`).join("\n");

  return `# Task
You are a legal compliance expert for landlord-tenant law.
Review the following landlord message for compliance issues.

# Jurisdiction Context
${jurisdictionLine}
Recipient type: ${recipientType}${rulesSection}

# Message to Review
"""
${messageText}
"""

# Instructions
Identify and report:
1. Fair housing violations
   - Discriminatory language or criteria
   - Violations of protected class laws (race, color, national origin, religion, sex, familial status, disability, and other protected classes)
2. Improper notice language
   - Missing required disclosures
   - Incorrect notice periods for this jurisdiction
   - Improper formatting requirements
3. Liability risks
   - Threats or illegal demands
   - Attempts to circumvent law (illegal self-help eviction)
   - Missing statutory language required by jurisdiction
4. Retaliation concerns
   - Any language that could be construed as retaliatory

# Output Format
Return ONLY valid JSON (no markdown, no explanation):
{
  "findings": [
    {
      "severity": "warning" | "error",
      "type": "fair_housing" | "notice_language" | "disclosure" | "other",
      "flagged_text": "exact text from message that is problematic",
      "reason": "clear explanation of the legal issue",
      "suggestion": "specific correction or alternative wording"
    }
  ],
  "overall_risk_level": "low" | "medium" | "high",
  "safe_to_send": true | false,
  "escalation_required": true | false,
  "escalation_reason": "reason if escalation needed, otherwise null"
}

# Escalation Triggers
Set escalation_required to true and suggest attorney review when message involves:
${escalationList}

If no issues are found, return empty findings, overall_risk_level "low", safe_to_send true, escalation_required false, escalation_reason null.`;
}

/**
 * Builds the notice generation prompt for POST /api/compliance/notices/generate.
 * Returns a prompt string that asks Claude to return structured JSON.
 *
 * Output format (JSON):
 * {
 *   notice_text: string,        // full notice letter
 *   statutory_citations: string[],
 *   notice_period_days: number
 * }
 *
 * @param noticeType         - "entry" | "lease_violation" | "rent_increase" | "eviction"
 * @param jurisdiction       - State/city for jurisdiction context
 * @param jurisdictionRules  - Pre-formatted jurisdiction rules text
 * @param contextLines       - Notice-specific details (tenant name, issue, dates, etc.)
 */
export function buildNoticePrompt(
  noticeType: string,
  jurisdiction: JurisdictionContext,
  jurisdictionRules: string,
  contextLines: string
): string {
  const jurisdictionLine = `${jurisdiction.state_code}${jurisdiction.city ? `, ${jurisdiction.city}` : ""}`;
  const noticeName = noticeType.replace(/_/g, " ");

  const rulesSection = jurisdictionRules
    ? `# Jurisdiction Rules and Requirements\n${jurisdictionRules}`
    : "# Jurisdiction Rules\nNo specific rules found. Apply general landlord-tenant best practices.";

  const isEviction = noticeType === "eviction";
  const escalationNote = isEviction
    ? "\n# Important\nThis is an eviction notice. Always include the disclaimer that attorney review is strongly recommended before serving."
    : "";

  return `# Task
You are an expert in landlord-tenant law and legal document generation.
Generate a legally-sound ${noticeName} notice for a property in ${jurisdictionLine}.

${rulesSection}

# Notice Details
Notice Type: ${noticeName}

# Context Data
${contextLines}

# Requirements
Generate a professional notice letter that:
1. Opens with the current date and a formal salutation
2. States the purpose of the notice clearly in the first paragraph
3. Cites all required statutes from the jurisdiction rules above
4. Specifies the notice period and effective date (use jurisdiction rules for required days)
5. Uses proper legal language appropriate for ${jurisdictionLine}
6. Closes with a professional signature block (leave landlord name/address as placeholders)
7. Ends with this mandatory disclaimer: "${COMPLIANCE_DISCLAIMERS.REVIEW_BEFORE_SEND}"
${escalationNote}

# Output Format
Return ONLY valid JSON (no markdown, no explanation):
{
  "notice_text": "The complete notice letter as a single string with newlines (\\n)",
  "statutory_citations": ["List all specific statutes cited, e.g. CA Civil Code § 1954"],
  "notice_period_days": <required notice period in days, or 0 if not applicable>
}`;
}
