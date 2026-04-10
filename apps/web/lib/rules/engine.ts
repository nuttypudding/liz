/**
 * Rule evaluation engine — partial implementation for test API (task 123)
 * Full processRulesForRequest() pipeline is added in task 124.
 */

import {
  AutomationRule,
  RuleCondition,
  RuleConditionType,
  ConditionOperator,
  ConditionResult,
  RuleTestRequest,
  RuleTestResponse,
} from "@/lib/types/rules";

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
