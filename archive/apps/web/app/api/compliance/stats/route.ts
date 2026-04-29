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

    // Get all properties for this landlord
    const { data: properties, error: propsError } = await supabase
      .from("properties")
      .select("id")
      .eq("landlord_id", userId);

    if (propsError) {
      return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
    }

    const props = properties ?? [];
    const totalProperties = props.length;

    if (totalProperties === 0) {
      return NextResponse.json({
        average_score: 0,
        properties_needing_attention: 0,
        critical_alerts_count: 0,
        total_properties: 0,
        score_distribution: { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 },
      });
    }

    const propertyIds = props.map((p) => p.id);

    // Fetch jurisdictions for all properties
    const { data: jurisdictions } = await supabase
      .from("property_jurisdictions")
      .select("property_id, state_code, city")
      .in("property_id", propertyIds);

    const jurisdictionMap = new Map(
      (jurisdictions ?? []).map((j) => [j.property_id, j])
    );

    // Fetch all unique state codes needed
    const stateCodes = [...new Set((jurisdictions ?? []).map((j) => j.state_code))];

    // Fetch all jurisdiction rules for those states
    const rulesByState = new Map<string, Map<string, number>>();
    if (stateCodes.length > 0) {
      const { data: allRules } = await supabase
        .from("jurisdiction_rules")
        .select("state_code, city, topic")
        .in("state_code", stateCodes);

      for (const rule of allRules ?? []) {
        if (!rulesByState.has(rule.state_code)) {
          rulesByState.set(rule.state_code, new Map());
        }
        // city-specific rules override state rules for same topic
        const stateRules = rulesByState.get(rule.state_code)!;
        stateRules.set(rule.topic, rule.city ? 1 : stateRules.get(rule.topic) ?? 0);
      }
    }

    // Fetch all compliance checklist items across all properties
    const { data: allChecklistItems } = await supabase
      .from("compliance_checklist_items")
      .select("property_id, topic, completed")
      .in("property_id", propertyIds);

    // Group by property_id
    const checklistByProperty = new Map<string, { topic: string; completed: boolean }[]>();
    for (const item of allChecklistItems ?? []) {
      if (!checklistByProperty.has(item.property_id)) {
        checklistByProperty.set(item.property_id, []);
      }
      checklistByProperty.get(item.property_id)!.push(item);
    }

    // Fetch open critical alerts (emergency requests not resolved)
    const { data: urgentRequests } = await supabase
      .from("maintenance_requests")
      .select("id, property_id")
      .in("property_id", propertyIds)
      .eq("ai_urgency", "emergency")
      .not("status", "in", "(resolved,closed)");

    const criticalAlertsCount = (urgentRequests ?? []).length;

    // Compute scores per property (only for those with jurisdictions)
    const scores: number[] = [];
    let propertiesNeedingAttention = 0;
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 };

    for (const propertyId of propertyIds) {
      const jurisdiction = jurisdictionMap.get(propertyId);
      if (!jurisdiction) continue; // No jurisdiction — skip from score calculation

      const stateRules = rulesByState.get(jurisdiction.state_code);
      if (!stateRules) continue;

      // Count rules applicable to this jurisdiction (state + optional city rules)
      const propertyItems = checklistByProperty.get(propertyId) ?? [];
      const completedTopics = new Set(
        propertyItems.filter((i) => i.completed).map((i) => i.topic)
      );

      // Compute total required topics for this jurisdiction
      const applicableTopics = new Set<string>();
      for (const [topic] of stateRules) {
        applicableTopics.add(topic);
      }

      const total = applicableTopics.size;
      if (total === 0) continue;

      const completed = [...applicableTopics].filter((t) => completedTopics.has(t)).length;
      const score = Math.round((completed / total) * 100);
      scores.push(score);

      if (score < 80) propertiesNeedingAttention++;

      if (score >= 80) distribution.excellent++;
      else if (score >= 60) distribution.good++;
      else if (score >= 40) distribution.fair++;
      else if (score >= 20) distribution.poor++;
      else distribution.critical++;
    }

    const averageScore =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    return NextResponse.json({
      average_score: averageScore,
      properties_needing_attention: propertiesNeedingAttention,
      critical_alerts_count: criticalAlertsCount,
      total_properties: totalProperties,
      score_distribution: distribution,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/compliance/stats:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
