import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

interface JurisdictionRule {
  id: string;
  topic: string;
  rule_text: string;
  statute_citation: string;
  details: Record<string, unknown> | null;
  last_verified_at: string;
}

interface JurisdictionGroup {
  state_code: string;
  city: string | null;
  rules: JurisdictionRule[];
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const stateCode = searchParams.get("state_code");
    const city = searchParams.get("city");
    const topic = searchParams.get("topic");
    const search = searchParams.get("search");
    const rawLimit = searchParams.get("limit");
    const rawOffset = searchParams.get("offset");

    const limit = Math.min(
      rawLimit ? parseInt(rawLimit, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const offset = rawOffset ? parseInt(rawOffset, 10) || 0 : 0;

    if (city && !stateCode) {
      return NextResponse.json(
        { error: "state_code is required when city is provided" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Validate state_code if provided
    if (stateCode) {
      const { data: stateExists } = await supabase
        .from("jurisdiction_rules")
        .select("id")
        .eq("state_code", stateCode)
        .limit(1)
        .single();

      if (!stateExists) {
        return NextResponse.json(
          { error: `No rules found for state_code: ${stateCode}` },
          { status: 400 }
        );
      }
    }

    // Validate city if provided
    if (city && stateCode) {
      const { data: cityExists } = await supabase
        .from("jurisdiction_rules")
        .select("id")
        .eq("state_code", stateCode)
        .eq("city", city)
        .limit(1)
        .single();

      if (!cityExists) {
        return NextResponse.json(
          { error: `No rules found for city: ${city} in state: ${stateCode}` },
          { status: 400 }
        );
      }
    }

    // Build base query
    let query = supabase
      .from("jurisdiction_rules")
      .select("id, state_code, city, topic, rule_text, statute_citation, details, last_verified_at", { count: "exact" });

    if (stateCode) {
      query = query.eq("state_code", stateCode);
    }
    if (city) {
      query = query.eq("city", city);
    }
    if (topic) {
      query = query.eq("topic", topic);
    }
    if (search) {
      query = query.or(`rule_text.ilike.%${search}%,statute_citation.ilike.%${search}%`);
    }

    const { data: rules, error, count } = await query
      .order("state_code", { ascending: true })
      .order("city", { ascending: true, nullsFirst: true })
      .order("topic", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching jurisdiction rules:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Group by jurisdiction (state_code + city)
    const jurisdictionMap = new Map<string, JurisdictionGroup>();

    for (const rule of rules ?? []) {
      const key = `${rule.state_code}::${rule.city ?? ""}`;
      if (!jurisdictionMap.has(key)) {
        jurisdictionMap.set(key, {
          state_code: rule.state_code,
          city: rule.city ?? null,
          rules: [],
        });
      }
      jurisdictionMap.get(key)!.rules.push({
        id: rule.id,
        topic: rule.topic,
        rule_text: rule.rule_text,
        statute_citation: rule.statute_citation,
        details: rule.details ?? null,
        last_verified_at: rule.last_verified_at,
      });
    }

    return NextResponse.json({
      jurisdictions: Array.from(jurisdictionMap.values()),
      total_count: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/compliance/knowledge:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
