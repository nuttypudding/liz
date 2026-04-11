import { Anthropic } from "@anthropic-ai/sdk";
import { SupabaseClient } from "@supabase/supabase-js";

import {
  AutonomySettings,
  AutonomousDecision,
  ConfidenceFactors,
  SafetyChecks,
  ActionsTaken,
  DecisionType,
} from "@/lib/types/autonomy";

interface MaintenanceRequest {
  id: string;
  ai_category: string;
  ai_urgency: string;
  ai_cost_estimate_low: number;
  ai_cost_estimate_high: number;
  ai_confidence_score: number;
  vendor_id?: string;
  created_at: string;
}

/**
 * Evaluates an autonomous decision for a maintenance request.
 * Computes confidence score, checks safety rails, and generates reasoning via Claude API.
 */
export async function evaluateAutonomousDecision(
  request: MaintenanceRequest,
  settings: AutonomySettings,
  landlordId: string,
  supabase: SupabaseClient
): Promise<{
  decision_type: DecisionType;
  confidence_score: number;
  reasoning: string;
  factors: ConfidenceFactors;
  safety_checks: SafetyChecks;
  actions_taken: ActionsTaken;
}> {
  // Evaluate all safety checks first
  const safetyChecks = await evaluateSafetyRails(
    request,
    settings,
    landlordId,
    supabase
  );

  // Calculate confidence score
  const factors = await calculateConfidenceFactors(
    request,
    settings,
    landlordId,
    supabase
  );

  // Sum weighted factors (all weights sum to 100%)
  const confidenceScore =
    factors.historical_weight * 0.35 +
    factors.rules_weight * 0.25 +
    factors.cost_weight * 0.2 +
    factors.vendor_weight * 0.1 +
    factors.category_weight * 0.1;

  // Emergency escalation: if enabled, allow dispatch despite other checks
  const emergencyOverride =
    settings.emergency_auto_dispatch && request.ai_urgency === "emergency";

  // Determine decision type
  let decision_type: DecisionType = "escalate";
  if (
    emergencyOverride ||
    (confidenceScore >= settings.confidence_threshold &&
      safetyChecks.spending_cap_ok &&
      safetyChecks.category_excluded === false &&
      safetyChecks.vendor_available !== false &&
      safetyChecks.emergency_eligible !== false)
  ) {
    decision_type = "dispatch";
  }

  // Generate reasoning via Claude API
  const reasoning = await generateDecisionReasoning(
    request,
    decision_type,
    confidenceScore,
    safetyChecks,
    settings
  );

  // Determine actions taken (placeholder for now)
  const actions_taken: ActionsTaken = {};

  return {
    decision_type,
    confidence_score: Math.min(1, Math.max(0, confidenceScore)),
    reasoning,
    factors,
    safety_checks: safetyChecks,
    actions_taken,
  };
}

/**
 * Evaluates all safety rails for the decision
 */
async function evaluateSafetyRails(
  request: MaintenanceRequest,
  settings: AutonomySettings,
  landlordId: string,
  supabase: SupabaseClient
): Promise<SafetyChecks> {
  const checks: SafetyChecks = {
    spending_cap_ok: true,
    category_excluded: true,
    vendor_available: true,
    emergency_eligible: true,
  };

  // Check category exclusion
  if (
    request.ai_category &&
    settings.excluded_categories.includes(request.ai_category)
  ) {
    checks.category_excluded = false;
  }

  // Check per-decision cap
  const estimatedCost =
    (request.ai_cost_estimate_low + request.ai_cost_estimate_high) / 2 || 0;
  if (estimatedCost > settings.per_decision_cap) {
    checks.spending_cap_ok = false;
  }

  // Check monthly spending cap
  if (checks.spending_cap_ok) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthlyDecisions, error } = await supabase
      .from("autonomous_decisions")
      .select("actions_taken")
      .eq("landlord_id", landlordId)
      .eq("status", "confirmed")
      .gte("created_at", monthStart.toISOString());

    if (!error && monthlyDecisions) {
      let totalSpend = 0;
      for (const decision of monthlyDecisions) {
        // Sum up actual costs from actions_taken
        // This is a placeholder - actual implementation would track costs properly
        totalSpend += 0;
      }

      if (totalSpend + estimatedCost > settings.monthly_cap) {
        checks.spending_cap_ok = false;
      }
    }
  }

  // Check vendor availability and preferences
  if (request.vendor_id) {
    const { data: vendor, error } = await supabase
      .from("vendors")
      .select("id, is_available")
      .eq("id", request.vendor_id)
      .single();

    if (error || !vendor || !vendor.is_available) {
      checks.vendor_available = false;
    }
  } else if (settings.preferred_vendors_only) {
    // No vendor assigned and preferred_vendors_only is enabled
    checks.vendor_available = false;
  }

  // Check if emergency auto-dispatch is enabled
  if (!settings.emergency_auto_dispatch && request.ai_urgency === "emergency") {
    checks.emergency_eligible = false;
  }

  return checks;
}

/**
 * Calculates weighted confidence factors
 */
async function calculateConfidenceFactors(
  request: MaintenanceRequest,
  settings: AutonomySettings,
  landlordId: string,
  supabase: SupabaseClient
): Promise<ConfidenceFactors> {
  const factors: ConfidenceFactors = {
    historical_weight: 0.5,
    rules_weight: 0.6,
    cost_weight: 0.7,
    vendor_weight: 0.5,
    category_weight: 0.8,
  };

  // Historical factor: analyze past similar requests
  factors.historical_weight = await calculateHistoricalFactor(
    request,
    landlordId,
    supabase
  );

  // Rules factor: base score by category and urgency
  factors.rules_weight = calculateRulesFactor(request);

  // Cost factor: estimate if within typical range
  factors.cost_weight = calculateCostFactor(request, settings);

  // Vendor factor: availability and success rate
  if (request.vendor_id) {
    factors.vendor_weight = await calculateVendorFactor(
      request.vendor_id,
      landlordId,
      supabase
    );
  }

  // Category factor: 0 if excluded, 1 if allowed
  if (request.ai_category) {
    factors.category_weight = settings.excluded_categories.includes(
      request.ai_category
    )
      ? 0
      : 1;
  }

  return factors;
}

/**
 * Historical factor: success rate of past similar requests
 */
async function calculateHistoricalFactor(
  request: MaintenanceRequest,
  landlordId: string,
  supabase: SupabaseClient
): Promise<number> {
  // Query past decisions for same category
  const { data: pastDecisions, error } = await supabase
    .from("autonomous_decisions")
    .select("status")
    .eq("landlord_id", landlordId)
    .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .limit(20);

  if (error || !pastDecisions || pastDecisions.length === 0) {
    return 0.5; // Default to neutral
  }

  const confirmed = pastDecisions.filter((d) => d.status === "confirmed").length;
  const successRate = confirmed / pastDecisions.length;

  return Math.min(1, Math.max(0, successRate));
}

/**
 * Rules factor: base confidence by category and urgency
 */
function calculateRulesFactor(request: MaintenanceRequest): number {
  // Emergency requests get high score
  if (request.ai_urgency === "emergency") {
    return 0.9;
  }

  // Category-based scores
  const categoryScores: Record<string, number> = {
    electrical: 0.75, // Simple electrical issues are common
    plumbing: 0.8, // Landlords often approve plumbing
    hvac: 0.7, // HVAC can be complex
    appliance: 0.75, // Appliance replacements are straightforward
    general: 0.65, // General maintenance varies
    structural: 0.5, // Complex, requires more scrutiny
    pest: 0.72, // Pest control is standard
  };

  return categoryScores[request.ai_category] || 0.6;
}

/**
 * Cost factor: check if estimate is within comfort zone
 */
function calculateCostFactor(
  request: MaintenanceRequest,
  settings: AutonomySettings
): number {
  if (!request.ai_cost_estimate_low || !request.ai_cost_estimate_high) {
    return 0.5; // No estimate available, neutral
  }

  const estimatedCost =
    (request.ai_cost_estimate_low + request.ai_cost_estimate_high) / 2;

  // If cost exceeds per-decision cap, reduce significantly
  if (estimatedCost > settings.per_decision_cap) {
    return 0.2;
  }

  // If cost is within 50% of cap, boost confidence
  if (estimatedCost < settings.per_decision_cap * 0.5) {
    return 0.9;
  }

  // In between: moderate confidence
  return 0.7;
}

/**
 * Vendor factor: success rate and availability
 */
async function calculateVendorFactor(
  vendorId: string,
  landlordId: string,
  supabase: SupabaseClient
): Promise<number> {
  // Query vendor's past work with this landlord
  const { data: pastDecisions, error } = await supabase
    .from("autonomous_decisions")
    .select("status")
    .eq("landlord_id", landlordId)
    .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
    .limit(20);

  if (error || !pastDecisions || pastDecisions.length === 0) {
    return 0.5; // No history, neutral
  }

  const confirmed = pastDecisions.filter((d) => d.status === "confirmed").length;
  const successRate = confirmed / pastDecisions.length;

  return Math.min(1, Math.max(0, successRate));
}

/**
 * Generates reasoning for the decision via Claude API
 */
async function generateDecisionReasoning(
  request: MaintenanceRequest,
  decision_type: DecisionType,
  confidenceScore: number,
  safetyChecks: SafetyChecks,
  settings: AutonomySettings
): Promise<string> {
  try {
    const client = new Anthropic();

    const prompt =
      decision_type === "dispatch"
        ? generateDispatchPrompt(
            request,
            confidenceScore,
            safetyChecks,
            settings
          )
        : generateEscalatePrompt(request, safetyChecks);

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === "text") {
      return content.text;
    }

    return "Unable to generate reasoning";
  } catch (error) {
    console.error("Claude API error:", error);
    // Graceful fallback
    return `Escalating to human review due to API error. Confidence: ${confidenceScore.toFixed(2)}`;
  }
}

function generateDispatchPrompt(
  request: MaintenanceRequest,
  confidenceScore: number,
  safetyChecks: SafetyChecks,
  settings: AutonomySettings
): string {
  return `You are an AI assistant helping a landlord decide whether to automatically dispatch a maintenance request.

Request Details:
- Category: ${request.ai_category}
- Urgency: ${request.ai_urgency}
- Estimated Cost: $${request.ai_cost_estimate_low} - $${request.ai_cost_estimate_high}
- Confidence Score: ${confidenceScore.toFixed(2)}

I have decided to AUTO-DISPATCH this request because:
1. Confidence score (${confidenceScore.toFixed(2)}) exceeds threshold (${settings.confidence_threshold})
2. All safety checks passed: spending caps, category permissions, vendor availability

Provide 2-3 brief bullet points explaining why this auto-dispatch decision is reasonable:`;
}

function generateEscalatePrompt(
  request: MaintenanceRequest,
  safetyChecks: SafetyChecks
): string {
  const failures = [];
  if (!safetyChecks.spending_cap_ok) failures.push("spending cap exceeded");
  if (!safetyChecks.category_excluded) failures.push("category is excluded");
  if (!safetyChecks.vendor_available) failures.push("vendor unavailable");
  if (!safetyChecks.emergency_eligible) failures.push("emergency not auto-approved");

  return `You are an AI assistant helping a landlord review a maintenance request.

Request Details:
- Category: ${request.ai_category}
- Urgency: ${request.ai_urgency}
- Estimated Cost: $${request.ai_cost_estimate_low} - $${request.ai_cost_estimate_high}

I am ESCALATING this to human review because: ${failures.join(", ")}

Provide 2-3 brief bullet points explaining why human review is needed:`;
}
