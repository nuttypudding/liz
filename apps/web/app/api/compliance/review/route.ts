import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { anthropic } from "@/lib/anthropic";
import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const reviewRequestSchema = z.object({
  message_text: z.string().min(1, "message_text is required"),
  property_id: z.string().uuid("property_id must be a valid UUID"),
  recipient_type: z.enum(["tenant", "vendor", "other"]).optional().default("tenant"),
});

type ComplianceFinding = {
  severity: "warning" | "error";
  type: "fair_housing" | "notice_language" | "disclosure" | "other";
  flagged_text: string;
  reason: string;
  suggestion: string;
};

type ClaudeReviewResult = {
  findings: ComplianceFinding[];
  overall_risk_level: "low" | "medium" | "high";
  safe_to_send: boolean;
};

function parseJsonFromText(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1] : text;
  return JSON.parse(jsonStr.trim());
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = reviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { message_text, property_id, recipient_type } = parsed.data;

    const supabase = createServerSupabaseClient();

    // Verify property ownership
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", property_id)
      .eq("landlord_id", userId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Fetch jurisdiction context
    const { data: jurisdiction } = await supabase
      .from("property_jurisdictions")
      .select("state_code, city")
      .eq("property_id", property_id)
      .single();

    const jurisdictionContext = jurisdiction
      ? `State: ${jurisdiction.state_code}${jurisdiction.city ? `, City: ${jurisdiction.city}` : ""}`
      : "Jurisdiction: not configured";

    // Fetch applicable jurisdiction rules for additional context
    let rulesContext = "";
    if (jurisdiction) {
      const rulesQuery = supabase
        .from("jurisdiction_rules")
        .select("topic, rule_text")
        .eq("state_code", jurisdiction.state_code);

      const { data: rules } = await (jurisdiction.city
        ? rulesQuery.or(`city.is.null,city.eq.${jurisdiction.city}`)
        : rulesQuery.is("city", null));

      if (rules && rules.length > 0) {
        rulesContext = `\n\nApplicable jurisdiction rules:\n${rules
          .slice(0, 10)
          .map((r) => `- ${r.topic}: ${r.rule_text.slice(0, 200)}`)
          .join("\n")}`;
      }
    }

    // Call Claude to review the message
    let reviewResult: ClaudeReviewResult = {
      findings: [],
      overall_risk_level: "low",
      safe_to_send: true,
    };

    try {
      const claudeResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `You are a legal compliance reviewer for landlord-tenant communications. Review the following landlord message for potential legal issues.

Jurisdiction: ${jurisdictionContext}
Recipient type: ${recipient_type}${rulesContext}

Message to review:
"""
${message_text}
"""

Analyze the message for:
1. Fair housing violations (discrimination based on race, color, national origin, religion, sex, familial status, disability, or other protected classes)
2. Improper notice language (missing required disclosures, improper formatting, incorrect notice periods)
3. Potential liability issues (threats, illegal demands, illegal self-help eviction language)
4. Missing statutory language required by jurisdiction

Respond with valid JSON only (no markdown):
{
  "findings": [
    {
      "severity": "warning" or "error",
      "type": "fair_housing" or "notice_language" or "disclosure" or "other",
      "flagged_text": "the exact text from the message that is problematic",
      "reason": "clear explanation of the legal issue",
      "suggestion": "specific correction or alternative wording"
    }
  ],
  "overall_risk_level": "low" or "medium" or "high",
  "safe_to_send": true or false
}

If no issues are found, return an empty findings array with overall_risk_level "low" and safe_to_send true.`,
          },
        ],
      });

      const rawText =
        claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text : "{}";
      reviewResult = parseJsonFromText(rawText) as ClaudeReviewResult;
    } catch (err) {
      console.error("Claude review call failed:", err);
      return NextResponse.json({ error: "AI review service unavailable" }, { status: 503 });
    }

    const reviewedAt = new Date().toISOString();

    // Log to compliance_audit_log
    try {
      const { data: profile } = await supabase
        .from("landlord_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (profile) {
        await supabase.from("compliance_audit_log").insert({
          property_id,
          landlord_id: profile.id,
          action_type: "communication_reviewed",
          details: {
            findings_count: reviewResult.findings.length,
            overall_risk_level: reviewResult.overall_risk_level,
            recipient_type,
          },
        });
      }
    } catch (auditErr) {
      console.error("Failed to log compliance audit (non-critical):", auditErr);
    }

    return NextResponse.json({
      property_id,
      jurisdiction: jurisdiction ?? null,
      findings: reviewResult.findings,
      overall_risk_level: reviewResult.overall_risk_level,
      safe_to_send: reviewResult.safe_to_send,
      disclaimer: COMPLIANCE_DISCLAIMERS.NOT_LEGAL_ADVICE,
      reviewed_at: reviewedAt,
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/compliance/review:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
