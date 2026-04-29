import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { anthropic } from "@/lib/anthropic";
import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers";
import { buildNoticePrompt, PROMPT_VERSION } from "@/lib/compliance/prompts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const VALID_NOTICE_TYPES = ["entry", "lease_violation", "rent_increase", "eviction"] as const;
type NoticeType = (typeof VALID_NOTICE_TYPES)[number];

const noticeContextSchema = z.object({
  tenant_name: z.string().min(1, "tenant_name is required"),
  issue_description: z.string().min(1, "issue_description is required"),
  proposed_date: z.string().optional(),
  rent_increase_amount: z.union([z.string(), z.number()]).optional(),
  effective_date: z.string().optional(),
  additional_details: z.string().optional(),
});

const generateNoticeSchema = z.object({
  property_id: z.string().uuid("property_id must be a valid UUID"),
  notice_type: z.enum(VALID_NOTICE_TYPES),
  context: noticeContextSchema,
});

// Required context fields per notice type
const REQUIRED_CONTEXT_FIELDS: Record<NoticeType, (keyof z.infer<typeof noticeContextSchema>)[]> =
  {
    entry: ["tenant_name", "issue_description", "proposed_date"],
    lease_violation: ["tenant_name", "issue_description"],
    rent_increase: ["tenant_name", "rent_increase_amount", "effective_date"],
    eviction: ["tenant_name", "issue_description", "effective_date"],
  };

type ClaudeNoticeResult = {
  notice_text: string;
  statutory_citations: string[];
  notice_period_days: number;
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
    const parsed = generateNoticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { property_id, notice_type, context } = parsed.data;

    // Validate required context fields for notice type
    const requiredFields = REQUIRED_CONTEXT_FIELDS[notice_type];
    const missingFields = requiredFields.filter((field) => !context[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required context fields for ${notice_type} notice: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

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

    // Fetch jurisdiction
    const { data: jurisdiction } = await supabase
      .from("property_jurisdictions")
      .select("state_code, city")
      .eq("property_id", property_id)
      .single();

    if (!jurisdiction) {
      return NextResponse.json(
        { error: "Property jurisdiction not configured" },
        { status: 400 }
      );
    }

    // Fetch applicable jurisdiction rules
    const rulesQuery = supabase
      .from("jurisdiction_rules")
      .select("topic, rule_text, notice_period_days, statutory_citations")
      .eq("state_code", jurisdiction.state_code);

    const { data: allRules } = await (jurisdiction.city
      ? rulesQuery.or(`city.is.null,city.eq.${jurisdiction.city}`)
      : rulesQuery.is("city", null));

    const rules = allRules ?? [];

    // Deduplicate: city rule overrides state rule for same topic
    const topicMap = new Map<string, (typeof rules)[number]>();
    for (const rule of rules) {
      topicMap.set(rule.topic, rule);
    }

    const jurisdictionRulesText = Array.from(topicMap.values())
      .map((r) => `- ${r.topic}: ${r.rule_text}`)
      .join("\n");

    const jurisdictionSnapshot = {
      state_code: jurisdiction.state_code,
      city: jurisdiction.city || null,
      rules: Array.from(topicMap.values()).map((r) => ({
        topic: r.topic,
        notice_period_days: r.notice_period_days,
        statutory_citations: r.statutory_citations,
      })),
    };

    // Build context description for Claude
    const contextLines = [
      `Tenant name: ${context.tenant_name}`,
      `Issue/reason: ${context.issue_description}`,
      context.proposed_date ? `Proposed date: ${context.proposed_date}` : null,
      context.rent_increase_amount
        ? `Rent increase amount: ${context.rent_increase_amount}`
        : null,
      context.effective_date ? `Effective date: ${context.effective_date}` : null,
      context.additional_details ? `Additional details: ${context.additional_details}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Call Claude to generate the notice
    let noticeResult: ClaudeNoticeResult;

    try {
      const prompt = buildNoticePrompt(notice_type, jurisdiction, jurisdictionRulesText, contextLines);
      const claudeResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      });

      const rawText =
        claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text : "";
      if (!rawText) {
        throw new Error("Empty response from Claude");
      }
      noticeResult = parseJsonFromText(rawText) as ClaudeNoticeResult;
    } catch (err) {
      console.error("Claude notice generation failed:", err);
      return NextResponse.json({ error: "AI notice generation service unavailable" }, { status: 503 });
    }

    const generatedAt = new Date().toISOString();

    // Get landlord profile for DB insert
    const { data: profile } = await supabase
      .from("landlord_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Landlord profile not found" }, { status: 404 });
    }

    // Store in compliance_notices
    const { data: notice, error: insertError } = await supabase
      .from("compliance_notices")
      .insert({
        property_id,
        landlord_id: profile.id,
        type: notice_type,
        status: "generated",
        content: noticeResult.notice_text,
        jurisdiction_data: jurisdictionSnapshot,
        created_at: generatedAt,
        updated_at: generatedAt,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to store compliance notice:", insertError);
    }

    // Audit log
    try {
      await supabase.from("compliance_audit_log").insert({
        property_id,
        landlord_id: profile.id,
        action_type: "notice_generated",
        details: {
          notice_id: notice?.id ?? null,
          notice_type,
          statutory_citations: noticeResult.statutory_citations,
          notice_period_days: noticeResult.notice_period_days,
        },
      });
    } catch (auditErr) {
      console.error("Failed to log compliance audit (non-critical):", auditErr);
    }

    return NextResponse.json({
      id: notice?.id ?? null,
      property_id,
      notice_type,
      status: "generated",
      content: noticeResult.notice_text,
      statutory_citations: noticeResult.statutory_citations ?? [],
      notice_period_days: noticeResult.notice_period_days ?? 0,
      effective_date: context.effective_date ?? context.proposed_date ?? null,
      prompt_version: PROMPT_VERSION,
      disclaimer: COMPLIANCE_DISCLAIMERS.REVIEW_BEFORE_SEND,
      generated_at: generatedAt,
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/compliance/notices/generate:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
