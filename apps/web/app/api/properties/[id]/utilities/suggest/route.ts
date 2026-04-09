import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { anthropic } from "@/lib/anthropic";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatAddress } from "@/lib/format";

type AiConfidence = "high" | "medium" | "low";
type UtilityType = "electric" | "gas" | "water_sewer" | "trash_recycling";

interface UtilitySuggestion {
  utility_type: UtilityType;
  provider_name: string | null;
  provider_phone: string | null;
  provider_website: string | null;
  confidence: AiConfidence;
}

interface ClaudeSuggestionPayload {
  utilities: UtilitySuggestion[];
}

const SYSTEM_PROMPT = `You are a utility company lookup assistant. Given a US property address, identify the most likely utility service providers. Return ONLY valid JSON matching the schema below. If you are unsure about a provider, set confidence to "low". If a utility type likely does not apply (e.g., no gas service in an all-electric area), set provider_name to null.

Schema:
{
  "utilities": [
    {
      "utility_type": "electric" | "gas" | "water_sewer" | "trash_recycling",
      "provider_name": string | null,
      "provider_phone": string | null,
      "provider_website": string | null,
      "confidence": "high" | "medium" | "low"
    }
  ]
}`;

const UTILITY_TYPES: UtilityType[] = ["electric", "gas", "water_sewer", "trash_recycling"];

function parseJsonFromText(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1] : text;
  return JSON.parse(jsonStr.trim());
}

function buildFallbackSuggestions(): UtilitySuggestion[] {
  return UTILITY_TYPES.map((utility_type) => ({
    utility_type,
    provider_name: null,
    provider_phone: null,
    provider_website: null,
    confidence: "low" as AiConfidence,
  }));
}

function normalizeSuggestions(raw: unknown): UtilitySuggestion[] {
  const payload = raw as ClaudeSuggestionPayload;
  if (!payload?.utilities || !Array.isArray(payload.utilities)) {
    return buildFallbackSuggestions();
  }

  // Ensure all 4 required types are present
  const byType = new Map<UtilityType, UtilitySuggestion>();
  for (const item of payload.utilities) {
    if (UTILITY_TYPES.includes(item.utility_type)) {
      byType.set(item.utility_type, {
        utility_type: item.utility_type,
        provider_name: item.provider_name ?? null,
        provider_phone: item.provider_phone ?? null,
        provider_website: item.provider_website ?? null,
        confidence: (["high", "medium", "low"].includes(item.confidence)
          ? item.confidence
          : "low") as AiConfidence,
      });
    }
  }

  return UTILITY_TYPES.map(
    (type) =>
      byType.get(type) ?? {
        utility_type: type,
        provider_name: null,
        provider_phone: null,
        provider_website: null,
        confidence: "low" as AiConfidence,
      }
  );
}

// Rate limit: max 5 suggest calls per property per day
// Uses a simple count of ai_suggested rows updated today as a proxy.
// A dedicated rate-limit table would be more precise but adds complexity for MVP.
const DAILY_LIMIT = 5;
const rateLimitStore = new Map<string, { count: number; date: string }>();

function checkRateLimit(propertyId: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const entry = rateLimitStore.get(propertyId);

  if (!entry || entry.date !== today) {
    rateLimitStore.set(propertyId, { count: 1, date: today });
    return true;
  }

  if (entry.count >= DAILY_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: propertyId } = await params;
    const supabase = createServerSupabaseClient();

    // Landlord only — verify ownership
    const { data: property } = await supabase
      .from("properties")
      .select("id, address_line1, city, state, postal_code")
      .eq("id", propertyId)
      .eq("landlord_id", userId)
      .maybeSingle();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const propertyAddress = property as {
      id: string;
      address_line1: string;
      city: string;
      state: string;
      postal_code: string;
    };
    const address = formatAddress(propertyAddress);
    if (!address || !propertyAddress.address_line1) {
      return NextResponse.json(
        { error: "Property has no address. Add an address before auto-detecting utilities." },
        { status: 422 }
      );
    }

    // Rate limit check
    if (!checkRateLimit(propertyId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 5 suggest calls per property per day." },
        { status: 429 }
      );
    }

    // Call Claude Haiku for utility suggestions
    let suggestions: UtilitySuggestion[];
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Property address: ${address}`,
          },
        ],
      });

      const rawText =
        response.content[0].type === "text" ? response.content[0].text : "{}";
      const parsed = parseJsonFromText(rawText);
      suggestions = normalizeSuggestions(parsed);
    } catch (err) {
      console.error("Claude API call failed in utility suggest:", err);
      return NextResponse.json(
        {
          error: "Could not auto-detect utilities. Please enter manually.",
          suggestions: buildFallbackSuggestions(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("Unexpected error in POST /api/properties/[id]/utilities/suggest:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
