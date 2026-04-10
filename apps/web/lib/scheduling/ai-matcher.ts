import { anthropic } from "@/lib/anthropic";

export type DayPart = "morning" | "afternoon" | "evening";

export type TenantSlot = {
  date: string; // YYYY-MM-DD
  dayPart: DayPart;
};

export type VendorAvailabilityRule = {
  day_of_week: number; // 0-6
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  timezone: string;
};

export type SlotSuggestion = {
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  reason: string;
  score: number; // 0-100
};

export type SuggestResult = {
  suggestions: SlotSuggestion[];
  noOverlapReason?: string;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DURATION_BY_URGENCY: Record<string, string> = {
  low: "2 hours",
  medium: "1 hour",
  emergency: "30 minutes",
};

// Simple in-memory cache keyed on input hash, TTL 15 minutes
const suggestCache = new Map<string, { result: SuggestResult; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function formatVendorAvailability(rules: VendorAvailabilityRule[]): string {
  if (rules.length === 0) return "No vendor availability on record.";
  return rules
    .map((r) => `  ${DAY_NAMES[r.day_of_week]}: ${r.start_time}–${r.end_time} (${r.timezone})`)
    .join("\n");
}

function formatTenantAvailability(slots: TenantSlot[]): string {
  if (slots.length === 0) return "No tenant availability provided.";
  return slots.map((s) => `  ${s.date} (${s.dayPart})`).join("\n");
}

/**
 * Use Claude Sonnet to suggest optimized appointment time slots based on
 * vendor weekly availability rules and tenant day-part preferences.
 */
export async function suggestSchedulingSlots(
  requestCategory: string,
  vendorAvailability: VendorAvailabilityRule[],
  tenantAvailability: TenantSlot[],
  urgency: "low" | "medium" | "emergency",
  landlordTimezone: string
): Promise<SuggestResult> {
  if (tenantAvailability.length === 0) {
    return { suggestions: [], noOverlapReason: "No tenant availability submitted yet." };
  }

  const cacheKey = JSON.stringify({
    requestCategory,
    vendorAvailability,
    tenantAvailability,
    urgency,
    landlordTimezone,
  });
  const cached = suggestCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const duration = DURATION_BY_URGENCY[urgency] ?? "1 hour";

  const prompt = `You are a scheduling assistant for a property maintenance platform.

Work order:
- Category: ${requestCategory}
- Urgency: ${urgency}
- Estimated duration: ${duration}
- Landlord timezone: ${landlordTimezone}

Vendor weekly availability:
${formatVendorAvailability(vendorAvailability)}

Tenant available windows (date + preferred time of day):
${formatTenantAvailability(tenantAvailability)}

Suggest 3–5 appointment time slots where vendor and tenant availability overlap. Pick a specific start and end time within each overlap. Rank by fit score (100 = perfect).

If no overlap exists, set suggestions to [] and explain in no_overlap_reason.

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "suggestions": [
    {
      "date": "YYYY-MM-DD",
      "time_start": "HH:MM",
      "time_end": "HH:MM",
      "reason": "brief explanation",
      "score": 85
    }
  ],
  "no_overlap_reason": null
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    let parsed: {
      suggestions: Array<{
        date: string;
        time_start: string;
        time_end: string;
        reason: string;
        score: number;
      }>;
      no_overlap_reason?: string | null;
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("[ai-matcher] Failed to parse Claude response:", text);
      return { suggestions: [] };
    }

    if (!Array.isArray(parsed.suggestions)) {
      return { suggestions: [] };
    }

    const suggestions: SlotSuggestion[] = parsed.suggestions
      .filter(
        (s) =>
          typeof s.date === "string" &&
          typeof s.time_start === "string" &&
          typeof s.time_end === "string" &&
          typeof s.reason === "string" &&
          typeof s.score === "number"
      )
      .map((s) => ({
        date: s.date,
        timeStart: s.time_start,
        timeEnd: s.time_end,
        reason: s.reason,
        score: s.score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const result: SuggestResult = {
      suggestions,
      ...(parsed.no_overlap_reason ? { noOverlapReason: parsed.no_overlap_reason } : {}),
    };

    suggestCache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (err) {
    console.error("[ai-matcher] Claude API error:", err);
    return { suggestions: [] };
  }
}
