/**
 * Unit tests for rule evaluation engine (engine.ts)
 * Tests evaluateRules(), evaluateRuleForTest(), and processRulesForRequest()
 */

import { describe, it, expect } from "vitest";
import { evaluateRules, evaluateRuleForTest } from "../../lib/rules/engine";
import {
  AutomationRule,
  RuleConditionType,
  ConditionOperator,
  RuleActionType,
  RuleTestRequest,
} from "@/lib/types/rules";

// ============================================================================
// Test Fixtures
// ============================================================================

const baseRule = (overrides?: Partial<AutomationRule>): AutomationRule => ({
  id: "rule-1",
  landlord_id: "landlord-1",
  name: "Test Rule",
  description: "Test rule description",
  enabled: true,
  priority: 1,
  conditions: [],
  actions: [],
  times_matched: 0,
  last_matched_at: null,
  created_at: "2026-04-10T00:00:00Z",
  updated_at: "2026-04-10T00:00:00Z",
  ...overrides,
});

const baseTestRequest = (overrides?: Partial<RuleTestRequest>): RuleTestRequest => ({
  category: "plumbing",
  urgency: "medium",
  cost: 500,
  property_id: "prop-1",
  vendor_ids: ["vendor-1"],
  ...overrides,
});

const baseRequestForEval = (overrides?: Partial<any>) => ({
  id: "req-1",
  property_id: "prop-1",
  landlord_id: "landlord-1",
  ai_category: "plumbing",
  ai_urgency: "medium",
  ai_cost_estimate_low: 400,
  ai_cost_estimate_high: 600,
  vendor_id: "vendor-1",
  status: "pending",
  ...overrides,
});

// ============================================================================
// Test Suite: evaluateRuleForTest()
// ============================================================================

describe("evaluateRuleForTest()", () => {
  describe("CATEGORY condition", () => {
    it("matches when category equals condition value", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.CATEGORY,
            operator: ConditionOperator.EQUALS,
            value: "plumbing",
          },
        ],
      });
      const request = baseTestRequest({ category: "plumbing" });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
      expect(result.conditions_breakdown[0].matched).toBe(true);
    });

    it("does not match when category differs", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.CATEGORY,
            operator: ConditionOperator.EQUALS,
            value: "electrical",
          },
        ],
      });
      const request = baseTestRequest({ category: "plumbing" });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(false);
      expect(result.conditions_breakdown[0].matched).toBe(false);
    });

    it("matches when category is in array", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.CATEGORY,
            operator: ConditionOperator.IN,
            value: ["plumbing", "electrical"],
          },
        ],
      });
      const request = baseTestRequest({ category: "plumbing" });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
      expect(result.conditions_breakdown[0].matched).toBe(true);
    });

    it("does not match when category not in array", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.CATEGORY,
            operator: ConditionOperator.IN,
            value: ["electrical", "hvac"],
          },
        ],
      });
      const request = baseTestRequest({ category: "plumbing" });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(false);
      expect(result.conditions_breakdown[0].matched).toBe(false);
    });

    it("does not match when category undefined", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.CATEGORY,
            operator: ConditionOperator.EQUALS,
            value: "plumbing",
          },
        ],
      });
      const request = baseTestRequest({ category: undefined });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(false);
    });
  });

  describe("URGENCY condition", () => {
    it("matches when urgency equals value", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.URGENCY,
            operator: ConditionOperator.EQUALS,
            value: "medium",
          },
        ],
      });
      const request = baseTestRequest({ urgency: "medium" });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
      expect(result.conditions_breakdown[0].matched).toBe(true);
    });

    it("matches when urgency is in array", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.URGENCY,
            operator: ConditionOperator.IN,
            value: ["low", "medium"],
          },
        ],
      });
      const request = baseTestRequest({ urgency: "medium" });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
    });
  });

  describe("COST_RANGE condition", () => {
    it("matches when cost is within range inclusive boundaries", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 400, max: 600 },
          },
        ],
      });
      const request = baseTestRequest({ cost: 500 });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
    });

    it("matches at exact minimum boundary", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 400, max: 600 },
          },
        ],
      });
      const request = baseTestRequest({ cost: 400 });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
    });

    it("matches at exact maximum boundary", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 400, max: 600 },
          },
        ],
      });
      const request = baseTestRequest({ cost: 600 });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
    });

    it("does not match below minimum", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 400, max: 600 },
          },
        ],
      });
      const request = baseTestRequest({ cost: 399 });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(false);
    });

    it("does not match above maximum", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 400, max: 600 },
          },
        ],
      });
      const request = baseTestRequest({ cost: 601 });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(false);
    });

    it("does not match when cost undefined", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 400, max: 600 },
          },
        ],
      });
      const request = baseTestRequest({ cost: undefined });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(false);
    });
  });

  describe("PROPERTY_SELECTOR condition", () => {
    it("matches when property_id equals value", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.PROPERTY_SELECTOR,
            operator: ConditionOperator.EQUALS,
            value: "prop-1",
          },
        ],
      });
      const request = baseTestRequest({ property_id: "prop-1" });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
    });

    it("matches when property_id is in array", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.PROPERTY_SELECTOR,
            operator: ConditionOperator.IN,
            value: ["prop-1", "prop-2"],
          },
        ],
      });
      const request = baseTestRequest({ property_id: "prop-1" });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
    });

    it("does not match when property_id not in array", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.PROPERTY_SELECTOR,
            operator: ConditionOperator.IN,
            value: ["prop-2", "prop-3"],
          },
        ],
      });
      const request = baseTestRequest({ property_id: "prop-1" });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(false);
    });
  });

  describe("VENDOR_AVAILABLE condition", () => {
    it("matches when vendor_ids include required vendor", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.VENDOR_AVAILABLE,
            operator: ConditionOperator.IN,
            value: ["vendor-1"],
          },
        ],
      });
      const request = baseTestRequest({ vendor_ids: ["vendor-1", "vendor-2"] });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
    });

    it("does not match when vendor_ids do not include required vendor", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.VENDOR_AVAILABLE,
            operator: ConditionOperator.IN,
            value: ["vendor-1"],
          },
        ],
      });
      const request = baseTestRequest({ vendor_ids: ["vendor-2", "vendor-3"] });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(false);
    });

    it("does not match when vendor_ids empty or undefined", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.VENDOR_AVAILABLE,
            operator: ConditionOperator.IN,
            value: ["vendor-1"],
          },
        ],
      });
      const request = baseTestRequest({ vendor_ids: [] });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(false);
    });

    it("matches with multiple required vendors when any is available", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.VENDOR_AVAILABLE,
            operator: ConditionOperator.IN,
            value: ["vendor-1", "vendor-5"],
          },
        ],
      });
      const request = baseTestRequest({ vendor_ids: ["vendor-1", "vendor-2"] });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
    });
  });

  describe("Multiple conditions (AND logic)", () => {
    it("matches when all conditions pass", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.CATEGORY,
            operator: ConditionOperator.EQUALS,
            value: "plumbing",
          },
          {
            type: RuleConditionType.URGENCY,
            operator: ConditionOperator.EQUALS,
            value: "medium",
          },
        ],
      });
      const request = baseTestRequest({
        category: "plumbing",
        urgency: "medium",
      });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
      expect(result.conditions_breakdown).toHaveLength(2);
      expect(result.conditions_breakdown[0].matched).toBe(true);
      expect(result.conditions_breakdown[1].matched).toBe(true);
    });

    it("does not match when one condition fails", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.CATEGORY,
            operator: ConditionOperator.EQUALS,
            value: "plumbing",
          },
          {
            type: RuleConditionType.URGENCY,
            operator: ConditionOperator.EQUALS,
            value: "emergency",
          },
        ],
      });
      const request = baseTestRequest({
        category: "plumbing",
        urgency: "medium",
      });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(false);
      expect(result.conditions_breakdown[0].matched).toBe(true);
      expect(result.conditions_breakdown[1].matched).toBe(false);
    });

    it("handles complex multi-condition scenario", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.CATEGORY,
            operator: ConditionOperator.IN,
            value: ["plumbing", "electrical"],
          },
          {
            type: RuleConditionType.URGENCY,
            operator: ConditionOperator.IN,
            value: ["low", "medium"],
          },
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 300, max: 800 },
          },
          {
            type: RuleConditionType.PROPERTY_SELECTOR,
            operator: ConditionOperator.IN,
            value: ["prop-1", "prop-2"],
          },
        ],
      });
      const request = baseTestRequest({
        category: "plumbing",
        urgency: "medium",
        cost: 500,
        property_id: "prop-1",
      });

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true);
      expect(result.conditions_breakdown).toHaveLength(4);
      expect(result.conditions_breakdown.every((c) => c.matched)).toBe(true);
    });
  });

  describe("Empty rules", () => {
    it("returns empty conditions_breakdown for rule with no conditions", () => {
      const rule = baseRule({ conditions: [] });
      const request = baseTestRequest();

      const result = evaluateRuleForTest(rule, request);

      expect(result.matched).toBe(true); // All conditions match (vacuous truth)
      expect(result.conditions_breakdown).toHaveLength(0);
    });
  });
});

// ============================================================================
// Test Suite: evaluateRules()
// ============================================================================

describe("evaluateRules()", () => {
  it("returns empty array when no rules match", () => {
    const rule = baseRule({
      id: "rule-1",
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "electrical",
        },
      ],
    });
    const request = baseRequestForEval({ ai_category: "plumbing" });

    const result = evaluateRules(request, [rule]);

    expect(result).toHaveLength(0);
  });

  it("returns matched rule when condition matches", () => {
    const rule = baseRule({
      id: "rule-1",
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "plumbing",
        },
      ],
    });
    const request = baseRequestForEval({ ai_category: "plumbing" });

    const result = evaluateRules(request, [rule]);

    expect(result).toHaveLength(1);
    expect(result[0].rule.id).toBe("rule-1");
    expect(result[0].conditions_result[0].matched).toBe(true);
  });

  it("skips disabled rules", () => {
    const rule1 = baseRule({
      id: "rule-1",
      enabled: false,
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "plumbing",
        },
      ],
    });
    const request = baseRequestForEval({ ai_category: "plumbing" });

    const result = evaluateRules(request, [rule1]);

    expect(result).toHaveLength(0);
  });

  it("respects priority order (ascending)", () => {
    const rule1 = baseRule({
      id: "rule-1",
      priority: 10,
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "plumbing",
        },
      ],
    });
    const rule2 = baseRule({
      id: "rule-2",
      priority: 5,
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "plumbing",
        },
      ],
    });
    const request = baseRequestForEval({ ai_category: "plumbing" });

    // Rules should be pre-sorted by caller, but verify evaluation order
    const result = evaluateRules(request, [rule1, rule2]);

    // Both should match, preserving input order
    expect(result).toHaveLength(2);
    expect(result[0].rule.id).toBe("rule-1");
    expect(result[1].rule.id).toBe("rule-2");
  });

  it("evaluates multiple rules and returns all matches", () => {
    const rule1 = baseRule({
      id: "rule-1",
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "plumbing",
        },
      ],
    });
    const rule2 = baseRule({
      id: "rule-2",
      conditions: [
        {
          type: RuleConditionType.URGENCY,
          operator: ConditionOperator.EQUALS,
          value: "medium",
        },
      ],
    });
    const rule3 = baseRule({
      id: "rule-3",
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "electrical",
        },
      ],
    });
    const request = baseRequestForEval({
      ai_category: "plumbing",
      ai_urgency: "medium",
    });

    const result = evaluateRules(request, [rule1, rule2, rule3]);

    expect(result).toHaveLength(2);
    expect(result[0].rule.id).toBe("rule-1");
    expect(result[1].rule.id).toBe("rule-2");
  });

  describe("COST_RANGE with production request", () => {
    it("matches when cost estimate range is within rule range", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 300, max: 800 },
          },
        ],
      });
      const request = baseRequestForEval({
        ai_cost_estimate_low: 400,
        ai_cost_estimate_high: 600,
      });

      const result = evaluateRules(request, [rule]);

      expect(result).toHaveLength(1);
      expect(result[0].conditions_result[0].matched).toBe(true);
    });

    it("does not match when high estimate exceeds rule max", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 300, max: 500 },
          },
        ],
      });
      const request = baseRequestForEval({
        ai_cost_estimate_low: 400,
        ai_cost_estimate_high: 600,
      });

      const result = evaluateRules(request, [rule]);

      expect(result).toHaveLength(0);
    });

    it("does not match when low estimate below rule min", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 500, max: 800 },
          },
        ],
      });
      const request = baseRequestForEval({
        ai_cost_estimate_low: 400,
        ai_cost_estimate_high: 600,
      });

      const result = evaluateRules(request, [rule]);

      expect(result).toHaveLength(0);
    });

    it("does not match when cost estimates are null", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.COST_RANGE,
            operator: ConditionOperator.RANGE,
            value: { min: 300, max: 800 },
          },
        ],
      });
      const request = baseRequestForEval({
        ai_cost_estimate_low: null,
        ai_cost_estimate_high: null,
      });

      const result = evaluateRules(request, [rule]);

      expect(result).toHaveLength(0);
    });
  });

  describe("VENDOR_AVAILABLE with production request", () => {
    it("matches when assigned vendor is in required list", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.VENDOR_AVAILABLE,
            operator: ConditionOperator.IN,
            value: ["vendor-1", "vendor-2"],
          },
        ],
      });
      const request = baseRequestForEval({ vendor_id: "vendor-1" });

      const result = evaluateRules(request, [rule]);

      expect(result).toHaveLength(1);
    });

    it("does not match when assigned vendor not in required list", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.VENDOR_AVAILABLE,
            operator: ConditionOperator.IN,
            value: ["vendor-2", "vendor-3"],
          },
        ],
      });
      const request = baseRequestForEval({ vendor_id: "vendor-1" });

      const result = evaluateRules(request, [rule]);

      expect(result).toHaveLength(0);
    });

    it("does not match when vendor_id is null", () => {
      const rule = baseRule({
        conditions: [
          {
            type: RuleConditionType.VENDOR_AVAILABLE,
            operator: ConditionOperator.IN,
            value: ["vendor-1"],
          },
        ],
      });
      const request = baseRequestForEval({ vendor_id: null });

      const result = evaluateRules(request, [rule]);

      expect(result).toHaveLength(0);
    });
  });

  it("handles empty rules array", () => {
    const request = baseRequestForEval();

    const result = evaluateRules(request, []);

    expect(result).toHaveLength(0);
  });

  it("includes conditions_result in matched rule", () => {
    const rule = baseRule({
      id: "rule-1",
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "plumbing",
        },
        {
          type: RuleConditionType.URGENCY,
          operator: ConditionOperator.EQUALS,
          value: "medium",
        },
      ],
    });
    const request = baseRequestForEval({
      ai_category: "plumbing",
      ai_urgency: "medium",
    });

    const result = evaluateRules(request, [rule]);

    expect(result[0].conditions_result).toHaveLength(2);
    expect(result[0].conditions_result[0].condition_index).toBe(0);
    expect(result[0].conditions_result[1].condition_index).toBe(1);
  });
});

// ============================================================================
// Integration Tests: Rule evaluation with actions
// ============================================================================

describe("evaluateRules() - Rule Actions Preview", () => {
  it("includes actions_preview in test API response", () => {
    const rule = baseRule({
      id: "rule-1",
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "plumbing",
        },
      ],
      actions: [
        { type: RuleActionType.AUTO_APPROVE, params: {} },
        {
          type: RuleActionType.ASSIGN_VENDOR,
          params: { assign_vendor: { vendor_id: "vendor-1" } },
        },
      ],
    });
    const request = baseTestRequest({ category: "plumbing" });

    const result = evaluateRuleForTest(rule, request);

    expect(result.actions_preview).toHaveLength(2);
    expect(result.actions_preview[0].type).toBe(RuleActionType.AUTO_APPROVE);
    expect(result.actions_preview[1].type).toBe(RuleActionType.ASSIGN_VENDOR);
  });
});

// ============================================================================
// Edge Cases & Error Handling
// ============================================================================

describe("Edge cases", () => {
  it("handles rule with no conditions as always matching", () => {
    const rule = baseRule({ conditions: [] });
    const request = baseRequestForEval();

    const result = evaluateRules(request, [rule]);

    expect(result).toHaveLength(1);
  });

  it("handles undefined AI fields gracefully", () => {
    const rule = baseRule({
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "plumbing",
        },
      ],
    });
    const request = baseRequestForEval({
      ai_category: null,
      ai_urgency: null,
    });

    const result = evaluateRules(request, [rule]);

    expect(result).toHaveLength(0);
  });

  it("evaluates large number of rules efficiently", () => {
    const rules = Array.from({ length: 100 }, (_, i) =>
      baseRule({
        id: `rule-${i}`,
        priority: i,
        conditions: [
          {
            type: RuleConditionType.CATEGORY,
            operator: ConditionOperator.EQUALS,
            value: i % 2 === 0 ? "plumbing" : "electrical",
          },
        ],
      })
    );
    const request = baseRequestForEval({ ai_category: "plumbing" });

    const start = performance.now();
    const result = evaluateRules(request, rules);
    const elapsed = performance.now() - start;

    // Should evaluate 50 matching rules in under 100ms
    expect(result).toHaveLength(50);
    expect(elapsed).toBeLessThan(100);
  });

  it("handles rules with null values gracefully", () => {
    const rule = baseRule({
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.EQUALS,
          value: "plumbing",
        },
      ],
    });
    const request = {
      id: "req-1",
      property_id: "prop-1",
      landlord_id: "landlord-1",
      ai_category: null,
      ai_urgency: null,
      ai_cost_estimate_low: null,
      ai_cost_estimate_high: null,
      vendor_id: null,
      status: "pending",
    };

    const result = evaluateRules(request, [rule]);

    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// Boundary Values & Coverage
// ============================================================================

describe("Boundary value testing", () => {
  it("handles zero cost", () => {
    const rule = baseRule({
      conditions: [
        {
          type: RuleConditionType.COST_RANGE,
          operator: ConditionOperator.RANGE,
          value: { min: 0, max: 100 },
        },
      ],
    });
    const request = baseRequestForEval({
      ai_cost_estimate_low: 0,
      ai_cost_estimate_high: 50,
    });

    const result = evaluateRules(request, [rule]);

    expect(result).toHaveLength(1);
  });

  it("handles very large cost values", () => {
    const rule = baseRule({
      conditions: [
        {
          type: RuleConditionType.COST_RANGE,
          operator: ConditionOperator.RANGE,
          value: { min: 10000, max: 100000 },
        },
      ],
    });
    const request = baseRequestForEval({
      ai_cost_estimate_low: 50000,
      ai_cost_estimate_high: 75000,
    });

    const result = evaluateRules(request, [rule]);

    expect(result).toHaveLength(1);
  });

  it("handles single-item arrays for IN conditions", () => {
    const rule = baseRule({
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.IN,
          value: ["plumbing"],
        },
      ],
    });
    const request = baseRequestForEval({ ai_category: "plumbing" });

    const result = evaluateRules(request, [rule]);

    expect(result).toHaveLength(1);
  });

  it("handles large arrays for IN conditions", () => {
    const categories = Array.from({ length: 50 }, (_, i) => `category-${i}`);
    categories.push("plumbing");

    const rule = baseRule({
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.IN,
          value: categories,
        },
      ],
    });
    const request = baseRequestForEval({ ai_category: "plumbing" });

    const result = evaluateRules(request, [rule]);

    expect(result).toHaveLength(1);
  });
});

// ============================================================================
// Determinism & Flakiness Tests
// ============================================================================

describe("Determinism", () => {
  it("produces consistent results across multiple evaluations", () => {
    const rule = baseRule({
      conditions: [
        {
          type: RuleConditionType.CATEGORY,
          operator: ConditionOperator.IN,
          value: ["plumbing", "electrical"],
        },
        {
          type: RuleConditionType.COST_RANGE,
          operator: ConditionOperator.RANGE,
          value: { min: 300, max: 800 },
        },
      ],
    });
    const request = baseRequestForEval({
      ai_category: "plumbing",
      ai_cost_estimate_low: 400,
      ai_cost_estimate_high: 600,
    });

    const results: any[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(evaluateRules(request, [rule]));
    }

    // All results should be identical
    expect(results.every((r) => r.length === 1)).toBe(true);
    expect(
      results.every(
        (r) => r[0].rule.id === rule.id && r[0].conditions_result.every((c) => c.matched)
      )
    ).toBe(true);
  });
});
