---
id: 120
title: TypeScript types + Zod validation schemas for rules
tier: Haiku
depends_on: [119]
feature: P2-003-rule-based-automation
---

# 120 — TypeScript Types & Zod Schemas for Rules

## Objective
Define complete TypeScript types and Zod validation schemas for rule conditions, actions, and execution logs.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

All rule data structures must be strongly typed and validated at runtime to ensure correctness when evaluating rules against maintenance requests.

## Implementation

1. Create file `apps/web/lib/types/rules.ts`:

2. Define TypeScript types:
   - `RuleConditionType`: enum of valid condition types (category, urgency, cost_range, property_selector, vendor_available)
   - `RuleCondition`: object with type, operator (equals, in, range, matches), and value
   - `TimeWindow`: object with day_of_week, start_time, end_time for time-based conditions
   - `RuleActionType`: enum of valid action types (auto_approve, assign_vendor, notify_landlord, escalate)
   - `NotifyConfig`: object with method (in_app, email, sms), recipients (landlord, vendor, tenant)
   - `RuleAction`: object with type, params (varies by type)
   - `AutomationRule`: full rule object (id, landlord_id, name, enabled, priority, conditions, actions, timestamps)
   - `RuleExecutionLog`: execution record (id, request_id, rule_id, matched, conditions_result, actions_executed, evaluated_at)
   - `ConditionResult`: object tracking condition evaluation (condition_index, matched, details)
   - `ExecutedAction`: object tracking action execution (action_index, executed, result)
   - `RuleTestRequest`: sample request for testing (category, urgency, cost, property_id, vendor_ids)
   - `RuleTestResponse`: test results (matched, conditions_breakdown, actions_preview)
   - `RulesSummary`: dashboard summary (active_rules, auto_approved_this_month, total_processed_this_month)

3. Create Zod schemas in `apps/web/lib/schemas/rules.ts`:
   - `ZodRuleCondition`: validates condition structure
   - `ZodRuleAction`: validates action structure
   - `ZodAutomationRuleCreate`: for POST /api/rules (name required, conditions/actions required, priority optional)
   - `ZodAutomationRuleUpdate`: for PUT /api/rules/[id] (all fields optional)
   - `ZodRuleReorderRequest`: validates priority reorder payload
   - `ZodRuleTestRequest`: validates test endpoint payload
   - Ensure conditions array has at least 1 item, actions array has at least 1 item

4. Constraints to enforce via Zod:
   - Rule name: 1–255 characters
   - Description: 0–1000 characters
   - Conditions: 1+ items
   - Actions: 1+ items
   - Priority: 0–999
   - Cost ranges: positive numbers

5. Export all types and schemas from `apps/web/lib/index.ts`

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] All type definitions in rules.ts
3. [ ] All Zod schemas in rules.ts or schemas/rules.ts
4. [ ] Types exported from lib/index.ts
5. [ ] Test Zod validation with valid and invalid payloads
6. [ ] Condition/action types match feature plan
7. [ ] TypeScript strict mode passes
8. [ ] No `any` types used
9. [ ] Documentation comments on complex types
10. [ ] Ready for API routes (task 121)
