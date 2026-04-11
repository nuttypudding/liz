import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId } = await params;
    const supabase = createServerSupabaseClient();

    // Verify ownership
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("landlord_id", userId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Fetch jurisdiction
    const { data: jurisdiction } = await supabase
      .from("property_jurisdictions")
      .select("state_code, city")
      .eq("property_id", propertyId)
      .single();

    if (!jurisdiction) {
      return NextResponse.json(
        { error: "Property jurisdiction not configured" },
        { status: 400 }
      );
    }

    // Fetch all required topics for this jurisdiction (state + optional city)
    const rulesQuery = supabase
      .from("jurisdiction_rules")
      .select("topic, rule_text")
      .eq("state_code", jurisdiction.state_code);

    // Include statewide rules + city-specific rules
    const { data: allRules } = await (jurisdiction.city
      ? rulesQuery.or(`city.is.null,city.eq.${jurisdiction.city}`)
      : rulesQuery.is("city", null));

    const rules = allRules ?? [];

    // Deduplicate topics (city rule overrides state rule for same topic)
    const topicMap = new Map<string, string>();
    for (const rule of rules) {
      topicMap.set(rule.topic, rule.rule_text);
    }
    const totalRequiredCount = topicMap.size;

    // Fetch completed checklist items for this property
    const { data: checklistItems } = await supabase
      .from("compliance_checklist_items")
      .select("topic, description, completed")
      .eq("property_id", propertyId);

    const items = checklistItems ?? [];
    const completedTopics = new Set(
      items.filter((item) => item.completed).map((item) => item.topic)
    );
    const completedCount = completedTopics.size;

    // Calculate score
    const score =
      totalRequiredCount === 0
        ? 0
        : Math.round((completedCount / totalRequiredCount) * 100);

    // Build missing items list
    const completedTopicDescriptions = new Map(
      items.map((item) => [item.topic, item.description])
    );

    const missingItems = Array.from(topicMap.entries())
      .filter(([topic]) => !completedTopics.has(topic))
      .map(([topic, ruleText]) => ({
        topic,
        description:
          completedTopicDescriptions.get(topic) ??
          ruleText.slice(0, 120) + (ruleText.length > 120 ? "…" : ""),
      }));

    return NextResponse.json({
      property_id: propertyId,
      score,
      completed_count: completedCount,
      total_required_count: totalRequiredCount,
      missing_items: missingItems,
      calculated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/compliance/[propertyId]/score:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
