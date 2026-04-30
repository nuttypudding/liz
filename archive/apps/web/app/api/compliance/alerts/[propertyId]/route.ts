import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type AlertSeverity = "error" | "warning";

interface JurisdictionReference {
  rule_topic: string;
  statute_citation: string;
  required_days: number | null;
}

interface Alert {
  id: string;
  severity: AlertSeverity;
  type: string;
  title: string;
  description: string;
  affected_item: string;
  suggested_action: string;
  jurisdiction_reference: JurisdictionReference | null;
  created_at: string;
}

interface RuleDetails {
  notice_days?: number;
  [key: string]: unknown;
}

function filterAlerts(alerts: Alert[], severity: string): Alert[] {
  if (severity === "all") return alerts;
  return alerts.filter((a) => a.severity === severity);
}

export async function GET(
  request: NextRequest,
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const severityFilter = searchParams.get("severity") ?? "all";
    const sinceParam = searchParams.get("since");
    const sinceDate = sinceParam ? new Date(sinceParam) : null;

    const now = new Date().toISOString();
    const alerts: Alert[] = [];
    const seenKeys = new Set<string>();

    // Fetch jurisdiction
    const { data: jurisdiction } = await supabase
      .from("property_jurisdictions")
      .select("state_code, city")
      .eq("property_id", propertyId)
      .single();

    if (!jurisdiction) {
      const alert: Alert = {
        id: `${propertyId}-jurisdiction_not_configured`,
        severity: "warning",
        type: "jurisdiction_not_configured",
        title: "Property jurisdiction not configured",
        description:
          "No jurisdiction has been set for this property. Compliance rules and alerts require a jurisdiction to be configured.",
        affected_item: "property_jurisdictions",
        suggested_action:
          "Go to property settings and set the state and city for this property.",
        jurisdiction_reference: null,
        created_at: now,
      };
      const filtered = filterAlerts([alert], severityFilter);
      return NextResponse.json({
        property_id: propertyId,
        jurisdiction: null,
        alert_count: filtered.length,
        alerts: filtered,
      });
    }

    // Fetch applicable jurisdiction rules (city overrides state for same topic)
    const rulesQuery = supabase
      .from("jurisdiction_rules")
      .select("id, topic, rule_text, statute_citation, details")
      .eq("state_code", jurisdiction.state_code);

    const { data: allRules } = await (jurisdiction.city
      ? rulesQuery.or(`city.is.null,city.eq.${jurisdiction.city}`)
      : rulesQuery.is("city", null));

    const rules = allRules ?? [];
    const ruleMap = new Map<string, (typeof rules)[0]>();
    for (const rule of rules) {
      ruleMap.set(rule.topic, rule);
    }

    // --- ALERT: Incomplete checklist (score < 80%) ---
    const { data: checklistItems } = await supabase
      .from("compliance_checklist_items")
      .select("topic, completed")
      .eq("property_id", propertyId);

    const items = checklistItems ?? [];
    const completedTopics = new Set(
      items.filter((i) => i.completed).map((i) => i.topic)
    );
    const totalRequired = ruleMap.size;
    const completedCount = Array.from(ruleMap.keys()).filter((t) =>
      completedTopics.has(t)
    ).length;
    const score =
      totalRequired === 0
        ? 0
        : Math.round((completedCount / totalRequired) * 100);

    if (score < 80 && totalRequired > 0 && !seenKeys.has("incomplete_checklist")) {
      seenKeys.add("incomplete_checklist");
      alerts.push({
        id: `${propertyId}-incomplete_checklist`,
        severity: "warning",
        type: "incomplete_checklist",
        title: "Compliance checklist is incomplete",
        description: `Your property's compliance score is ${score}%. Completing required items ensures you meet local landlord-tenant law requirements.`,
        affected_item: "compliance_checklist_items",
        suggested_action:
          "Review and complete missing compliance checklist items for this property.",
        jurisdiction_reference: null,
        created_at: now,
      });
    }

    // --- ALERT: Missing security deposit disclosure ---
    const secDepRule = ruleMap.get("security_deposit_limit");
    if (
      secDepRule &&
      !completedTopics.has("security_deposit_limit") &&
      !seenKeys.has("missing_security_deposit_disclosure")
    ) {
      seenKeys.add("missing_security_deposit_disclosure");
      alerts.push({
        id: `${propertyId}-missing_security_deposit_disclosure`,
        severity: "warning",
        type: "missing_security_deposit_disclosure",
        title: "Security deposit disclosure not completed",
        description: `${jurisdiction.state_code} law (${secDepRule.statute_citation}) requires security deposit disclosure. Your compliance checklist shows this item is incomplete.`,
        affected_item: "compliance_checklist_items",
        suggested_action:
          "Complete the security deposit disclosure checklist item and ensure tenants have received required notices.",
        jurisdiction_reference: {
          rule_topic: "security_deposit_limit",
          statute_citation: secDepRule.statute_citation,
          required_days: null,
        },
        created_at: now,
      });
    }

    // --- ALERT: Missing lease terms ---
    const { data: tenantsWithMissingLeases } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("property_id", propertyId)
      .or("lease_start_date.is.null,lease_end_date.is.null");

    if (
      (tenantsWithMissingLeases ?? []).length > 0 &&
      !seenKeys.has("missing_lease_terms")
    ) {
      seenKeys.add("missing_lease_terms");
      const tenantNames = (tenantsWithMissingLeases ?? [])
        .map((t) => t.name)
        .join(", ");
      alerts.push({
        id: `${propertyId}-missing_lease_terms`,
        severity: "warning",
        type: "missing_lease_terms",
        title: "Lease terms not configured for some tenants",
        description: `The following tenants are missing lease start or end dates: ${tenantNames}. Without lease terms, compliance checks for notice periods and renewals cannot be performed.`,
        affected_item: "tenants",
        suggested_action:
          "Update tenant profiles to include lease start and end dates.",
        jurisdiction_reference: null,
        created_at: now,
      });
    }

    // --- ALERT: Habitability defect not addressed ---
    const habitabilityRule = ruleMap.get("habitability_requirement");

    let habQuery = supabase
      .from("maintenance_requests")
      .select("id, tenant_message, created_at")
      .eq("property_id", propertyId)
      .eq("ai_urgency", "emergency")
      .not("status", "in", "(resolved,closed)");

    if (sinceDate && !isNaN(sinceDate.getTime())) {
      habQuery = habQuery.gte("created_at", sinceDate.toISOString());
    }

    const { data: urgentRequests } = await habQuery;

    for (const req of urgentRequests ?? []) {
      const alertKey = `habitability_defect-${req.id}`;
      if (!seenKeys.has(alertKey)) {
        seenKeys.add(alertKey);
        alerts.push({
          id: `${propertyId}-${alertKey}`,
          severity: "error",
          type: "habitability_defect_not_addressed",
          title: "Urgent habitability defect not resolved",
          description: `A maintenance request classified as emergency has not been resolved. Unaddressed habitability issues may violate ${jurisdiction.state_code} law and expose you to tenant remedies.`,
          affected_item: `maintenance_requests:${req.id}`,
          suggested_action:
            "Resolve or schedule repair for this maintenance request immediately.",
          jurisdiction_reference: habitabilityRule
            ? {
                rule_topic: "habitability_requirement",
                statute_citation: habitabilityRule.statute_citation,
                required_days:
                  (habitabilityRule.details as RuleDetails)?.notice_days ?? null,
              }
            : null,
          created_at: req.created_at,
        });
      }
    }

    const filtered = filterAlerts(alerts, severityFilter);

    return NextResponse.json({
      property_id: propertyId,
      jurisdiction: {
        state_code: jurisdiction.state_code,
        city: jurisdiction.city,
      },
      alert_count: filtered.length,
      alerts: filtered,
    });
  } catch (err) {
    console.error(
      "Unexpected error in GET /api/compliance/alerts/[propertyId]:",
      err
    );
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
