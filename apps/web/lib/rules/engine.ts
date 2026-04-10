/**
 * Rule evaluation engine — evaluateRules() + processRulesForRequest()
 * The test-only evaluator (evaluateRuleForTest) is also exported for use by the test API.
 */

import { SupabaseClient } from "@supabase/supabase-js";

import {
  AutomationRule,
  RuleCondition,
  RuleConditionType,
  ConditionOperator,
  ConditionResult,
  ExecutedAction,
  RuleActionType,
  RuleTestRequest,
  RuleTestResponse,
} from "@/lib/types/rules";

// ---------------------------------------------------------------------------
// Internal type for evaluating a real maintenance request
// ---------------------------------------------------------------------------

interface RequestForEvaluation {
  id: string;
  property_id: string;
  landlord_id: string;
  ai_category: string | null;
  ai_urgency: string | null;
  ai_cost_estimate_low: number | null;
  ai_cost_estimate_high: number | null;
  vendor_id: string | null;
  status: string;
}

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export interface MatchedRule {
  rule: AutomationRule;
  conditions_result: ConditionResult[];
}

export interface ProcessResult {
  matched_rules: MatchedRule[];
  actions_applied: string[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Condition evaluator — test API (uses simplified RuleTestRequest)
// ---------------------------------------------------------------------------

function evaluateCondition(
  condition: RuleCondition,
  request: RuleTestRequest,
  index: number
): ConditionResult {
  const { type, operator, value } = condition;
  let matched = false;
  let description = "";

  switch (type) {
    case RuleConditionType.CATEGORY: {
      if (request.category === undefined) {
        description = "category not provided in test data";
      } else if (operator === ConditionOperator.EQUALS) {
        matched = request.category === value;
        description = `category "${request.category}" ${matched ? "matches" : "does not match"} "${value}"`;
      } else if (operator === ConditionOperator.IN) {
        const vals = value as string[];
        matched = vals.includes(request.category);
        description = `category "${request.category}" ${matched ? "is" : "is not"} in [${vals.join(", ")}]`;
      }
      break;
    }

    case RuleConditionType.URGENCY: {
      if (request.urgency === undefined) {
        description = "urgency not provided in test data";
      } else if (operator === ConditionOperator.EQUALS) {
        matched = request.urgency === value;
        description = `urgency "${request.urgency}" ${matched ? "matches" : "does not match"} "${value}"`;
      } else if (operator === ConditionOperator.IN) {
        const vals = value as string[];
        matched = vals.includes(request.urgency);
        description = `urgency "${request.urgency}" ${matched ? "is" : "is not"} in [${vals.join(", ")}]`;
      }
      break;
    }

    case RuleConditionType.COST_RANGE: {
      if (request.cost === undefined) {
        description = "cost not provided in test data";
      } else if (operator === ConditionOperator.RANGE) {
        const range = value as { min: number; max: number };
        matched = request.cost >= range.min && request.cost <= range.max;
        description = `cost ${request.cost} ${matched ? "is" : "is not"} in range [${range.min}, ${range.max}]`;
      }
      break;
    }

    case RuleConditionType.PROPERTY_SELECTOR: {
      if (request.property_id === undefined) {
        description = "property_id not provided in test data";
      } else if (operator === ConditionOperator.EQUALS) {
        matched = request.property_id === value;
        description = `property_id "${request.property_id}" ${matched ? "matches" : "does not match"} "${value}"`;
      } else if (operator === ConditionOperator.IN) {
        const vals = value as string[];
        matched = vals.includes(request.property_id);
        description = `property_id "${request.property_id}" ${matched ? "is" : "is not"} in property list`;
      }
      break;
    }

    case RuleConditionType.VENDOR_AVAILABLE: {
      const conditionVendors = value as string[];
      if (!request.vendor_ids || request.vendor_ids.length === 0) {
        description = "vendor_ids not provided in test data";
      } else {
        matched = conditionVendors.some((v) => request.vendor_ids!.includes(v));
        description = `vendor_ids ${matched ? "include" : "do not include"} any required vendor`;
      }
      break;
    }

    default:
      description = `unknown condition type: ${type}`;
  }

  return {
    condition_index: index,
    matched,
    details: { description },
  };
}

/**
 * Evaluate a single rule's conditions against sample test data.
 * Does NOT execute actions or modify any database records.
 */
export function evaluateRuleForTest(
  rule: AutomationRule,
  request: RuleTestRequest
): RuleTestResponse {
  const conditions_breakdown: ConditionResult[] = rule.conditions.map(
    (condition, index) =>
      evaluateCondition(condition as RuleCondition, request, index)
  );

  const matched = conditions_breakdown.every((c) => c.matched);

  return {
    matched,
    conditions_breakdown,
    actions_preview: rule.actions,
  };
}

// ---------------------------------------------------------------------------
// Condition evaluator — production (uses real DB maintenance request fields)
// ---------------------------------------------------------------------------

function evaluateConditionForRequest(
  condition: RuleCondition,
  request: RequestForEvaluation,
  index: number
): ConditionResult {
  const { type, operator, value } = condition;
  let matched = false;
  let description = "";

  switch (type) {
    case RuleConditionType.CATEGORY: {
      const category = request.ai_category;
      if (!category) {
        description = "request has no ai_category yet";
      } else if (operator === ConditionOperator.EQUALS) {
        matched = category === value;
        description = `category "${category}" ${matched ? "matches" : "does not match"} "${value}"`;
      } else if (operator === ConditionOperator.IN) {
        const vals = value as string[];
        matched = vals.includes(category);
        description = `category "${category}" ${matched ? "is" : "is not"} in [${vals.join(", ")}]`;
      }
      break;
    }

    case RuleConditionType.URGENCY: {
      const urgency = request.ai_urgency;
      if (!urgency) {
        description = "request has no ai_urgency yet";
      } else if (operator === ConditionOperator.EQUALS) {
        matched = urgency === value;
        description = `urgency "${urgency}" ${matched ? "matches" : "does not match"} "${value}"`;
      } else if (operator === ConditionOperator.IN) {
        const vals = value as string[];
        matched = vals.includes(urgency);
        description = `urgency "${urgency}" ${matched ? "is" : "is not"} in [${vals.join(", ")}]`;
      }
      break;
    }

    case RuleConditionType.COST_RANGE: {
      const costHigh = request.ai_cost_estimate_high;
      const costLow = request.ai_cost_estimate_low;
      if (costHigh === null || costLow === null) {
        description = "request has no cost estimate yet";
      } else if (operator === ConditionOperator.RANGE) {
        const range = value as { min: number; max: number };
        // Both the low and high estimate must fall within the rule's range.
        // This ensures auto-approve only fires when worst-case cost is still within bounds.
        matched = costLow >= range.min && costHigh <= range.max;
        description = `cost estimate [${costLow}, ${costHigh}] ${matched ? "is" : "is not"} within range [${range.min}, ${range.max}]`;
      }
      break;
    }

    case RuleConditionType.PROPERTY_SELECTOR: {
      if (operator === ConditionOperator.EQUALS) {
        matched = request.property_id === value;
        description = `property "${request.property_id}" ${matched ? "matches" : "does not match"} "${value}"`;
      } else if (operator === ConditionOperator.IN) {
        const vals = value as string[];
        matched = vals.includes(request.property_id);
        description = `property "${request.property_id}" ${matched ? "is" : "is not"} in property list`;
      }
      break;
    }

    case RuleConditionType.VENDOR_AVAILABLE: {
      const conditionVendors = value as string[];
      if (!request.vendor_id) {
        description = "request has no assigned vendor";
      } else {
        matched = conditionVendors.includes(request.vendor_id);
        description = `vendor "${request.vendor_id}" ${matched ? "is" : "is not"} in required vendor list`;
      }
      break;
    }

    default:
      description = `unknown condition type: ${type}`;
  }

  return {
    condition_index: index,
    matched,
    details: { description },
  };
}

// ---------------------------------------------------------------------------
// Core evaluation — rules against real maintenance request
// ---------------------------------------------------------------------------

/**
 * Evaluate a list of enabled rules against a classified maintenance request.
 * Rules must already be sorted by priority (ascending = highest priority first).
 * Returns only the rules that matched (all conditions passed).
 */
export function evaluateRules(
  request: RequestForEvaluation,
  rules: AutomationRule[]
): MatchedRule[] {
  const matched: MatchedRule[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const conditions_result = rule.conditions.map((condition, index) =>
      evaluateConditionForRequest(condition as RuleCondition, request, index)
    );

    // All conditions must pass (AND logic)
    if (conditions_result.every((r) => r.matched)) {
      matched.push({ rule, conditions_result });
    }
  }

  return matched;
}

// ---------------------------------------------------------------------------
// Full pipeline — load, evaluate, apply, log
// ---------------------------------------------------------------------------

/**
 * Run the full rules processing pipeline for a classified maintenance request.
 *
 * 1. Loads the request (with landlord_id via property join)
 * 2. Loads all enabled rules for the landlord (priority order)
 * 3. Evaluates rules via evaluateRules()
 * 4. Resolves action conflicts (escalate > auto_approve; highest-priority vendor wins)
 * 5. Updates the maintenance request
 * 6. Writes rule_execution_logs for each matched rule
 * 7. Increments times_matched on matched rules
 */
export async function processRulesForRequest(
  request_id: string,
  supabase: SupabaseClient
): Promise<ProcessResult> {
  const errors: string[] = [];
  const actions_applied: string[] = [];

  // --- Load request with landlord_id via property join ---
  const { data: req, error: reqError } = await supabase
    .from("maintenance_requests")
    .select(
      "id, property_id, ai_category, ai_urgency, ai_cost_estimate_low, ai_cost_estimate_high, vendor_id, status, properties!inner(landlord_id)"
    )
    .eq("id", request_id)
    .single();

  if (reqError || !req) {
    return {
      matched_rules: [],
      actions_applied: [],
      errors: [`Request not found: ${reqError?.message ?? "unknown error"}`],
    };
  }

  const propertiesData = req.properties as unknown as { landlord_id: string } | { landlord_id: string }[];
  const landlord_id = Array.isArray(propertiesData)
    ? propertiesData[0].landlord_id
    : propertiesData.landlord_id;

  // --- Load enabled rules sorted by priority ---
  const { data: rulesData, error: rulesError } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("landlord_id", landlord_id)
    .eq("enabled", true)
    .order("priority", { ascending: true });

  if (rulesError) {
    errors.push(`Failed to load rules: ${rulesError.message}`);
  }

  const rules = (rulesData ?? []) as AutomationRule[];

  const requestForEval: RequestForEvaluation = {
    id: req.id as string,
    property_id: req.property_id as string,
    landlord_id,
    ai_category: req.ai_category as string | null,
    ai_urgency: req.ai_urgency as string | null,
    ai_cost_estimate_low: req.ai_cost_estimate_low as number | null,
    ai_cost_estimate_high: req.ai_cost_estimate_high as number | null,
    vendor_id: req.vendor_id as string | null,
    status: req.status as string,
  };

  // --- Evaluate rules ---
  const matched_rules = evaluateRules(requestForEval, rules);

  // --- Collect and resolve actions ---
  let shouldEscalate = false;
  let shouldAutoApprove = false;
  let autoApproveRuleId: string | null = null;
  let vendorIdToAssign: string | null = null;

  for (const { rule } of matched_rules) {
    for (const action of rule.actions) {
      switch (action.type) {
        case RuleActionType.ESCALATE:
          shouldEscalate = true;
          break;

        case RuleActionType.AUTO_APPROVE:
          // First matched rule (highest priority) wins
          if (!shouldAutoApprove) {
            shouldAutoApprove = true;
            autoApproveRuleId = rule.id;
          }
          break;

        case RuleActionType.ASSIGN_VENDOR: {
          // Highest-priority rule's vendor wins
          const vendorId = action.params.assign_vendor?.vendor_id;
          if (vendorId && !vendorIdToAssign) {
            vendorIdToAssign = vendorId;
          }
          break;
        }

        case RuleActionType.NOTIFY_LANDLORD:
          // Logged below per-rule; actual delivery is future work
          break;
      }
    }
  }

  // --- Build update payload ---
  // Conflict resolution: escalate overrides auto_approve (safety first)
  const updatePayload: Record<string, unknown> = {
    rules_evaluated_at: new Date().toISOString(),
  };

  if (shouldEscalate) {
    updatePayload.status = "escalated";
    updatePayload.ai_urgency = "emergency";
    actions_applied.push("escalated");
  } else if (shouldAutoApprove) {
    updatePayload.status = "approved";
    updatePayload.auto_approved = true;
    updatePayload.auto_approved_by_rule_id = autoApproveRuleId;
    actions_applied.push("auto_approved");
  }

  if (vendorIdToAssign) {
    updatePayload.vendor_id = vendorIdToAssign;
    actions_applied.push(`vendor_assigned:${vendorIdToAssign}`);
  }

  // --- Persist request changes ---
  const { error: updateError } = await supabase
    .from("maintenance_requests")
    .update(updatePayload)
    .eq("id", request_id);

  if (updateError) {
    errors.push(`Failed to update request: ${updateError.message}`);
  }

  // --- Write execution logs and update stats for each matched rule ---
  const now = new Date().toISOString();

  for (const { rule, conditions_result } of matched_rules) {
    const executedActions: ExecutedAction[] = rule.actions.map((action, i) => {
      let detail = "";
      switch (action.type) {
        case RuleActionType.AUTO_APPROVE:
          detail = shouldEscalate
            ? "skipped — escalate takes priority"
            : "request marked as auto-approved";
          break;
        case RuleActionType.ASSIGN_VENDOR:
          detail =
            vendorIdToAssign === action.params.assign_vendor?.vendor_id
              ? `vendor ${vendorIdToAssign} assigned`
              : "skipped — higher-priority rule already assigned a vendor";
          break;
        case RuleActionType.NOTIFY_LANDLORD:
          detail = `notification intent logged (method: ${action.params.notify_landlord?.method ?? "in_app"})`;
          break;
        case RuleActionType.ESCALATE:
          detail = "request escalated to emergency";
          break;
        default:
          detail = "executed";
      }

      return { action_index: i, executed: true, result: { detail } };
    });

    const { error: logError } = await supabase
      .from("rule_execution_logs")
      .insert({
        request_id,
        rule_id: rule.id,
        landlord_id,
        matched: true,
        conditions_result,
        actions_executed: executedActions,
        evaluated_at: now,
      });

    if (logError) {
      errors.push(`Failed to write execution log for rule ${rule.id}: ${logError.message}`);
    }

    // Increment times_matched
    const { error: statsError } = await supabase
      .from("automation_rules")
      .update({
        times_matched: rule.times_matched + 1,
        last_matched_at: now,
      })
      .eq("id", rule.id);

    if (statsError) {
      errors.push(`Failed to update rule stats for ${rule.id}: ${statsError.message}`);
    }

    // Track notify actions in applied list
    for (const action of rule.actions) {
      if (action.type === RuleActionType.NOTIFY_LANDLORD) {
        actions_applied.push(
          `notify_landlord:${action.params.notify_landlord?.method ?? "in_app"}`
        );
      }
    }
  }

  return { matched_rules, actions_applied, errors };
}
