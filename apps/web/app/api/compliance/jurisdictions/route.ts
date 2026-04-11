import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch distinct state_code + city pairs from jurisdiction_rules
    const { data: rules, error } = await supabase
      .from("jurisdiction_rules")
      .select("state_code, city");

    if (error) {
      console.error("Error fetching jurisdiction rules:", error);
      return NextResponse.json(
        { error: "Failed to fetch jurisdictions" },
        { status: 500 }
      );
    }

    // Build states list and cities-by-state map
    const stateSet = new Set<string>();
    const citiesByState = new Map<string, Set<string>>();

    for (const rule of rules ?? []) {
      stateSet.add(rule.state_code);
      if (rule.city) {
        if (!citiesByState.has(rule.state_code)) {
          citiesByState.set(rule.state_code, new Set());
        }
        citiesByState.get(rule.state_code)!.add(rule.city);
      }
    }

    const states = Array.from(stateSet).sort();
    const cities: Record<string, string[]> = {};
    for (const [state, citySet] of citiesByState) {
      cities[state] = Array.from(citySet).sort();
    }

    return NextResponse.json({ states, cities });
  } catch (err) {
    console.error("Unexpected error in GET /api/compliance/jurisdictions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
