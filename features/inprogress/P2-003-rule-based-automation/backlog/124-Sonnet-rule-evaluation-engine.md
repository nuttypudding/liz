---
id: 124
title: Rule evaluation engine — evaluateRules() + processRulesForRequest()
tier: Sonnet
depends_on: [119, 120]
feature: P2-003-rule-based-automation
---

# 124 — Rule Evaluation Engine

## Objective
Implement core rule evaluation logic and request processing pipeline.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

This is the heart of the rules system. evaluateRules() checks condition logic; processRulesForRequest() orchestrates evaluation and applies actions to maintenance requests.

## Implementation

1. Create `apps/web/lib/rules/engine.ts`:

2. Implement `evaluateRules(request, rules)` function:
   - Signature: `(request: MaintenanceRequest, rules: AutomationRule[]): MatchedRule[]`
   - Iterate rules in priority order (ascending)
   - For each rule, check `enabled` flag (skip disabled rules)
   - Evaluate conditions against request:
     - `category`: check if request.category matches condition value
     - `urgency`: check if request.urgency matches condition value
     - `cost_range`: check if request.estimated_cost falls within range
     - `property_selector`: check if request.property_id matches condition (or matches property tags)
     - `vendor_available`: check if any vendor_ids in condition match request's assigned vendor
   - Condition operators: `equals`, `in` (array match), `range` (numeric range), `matches` (string pattern)
   - ALL conditions must match (AND logic) for rule to match
   - Return list of matched rules with condition breakdown
   - Return empty array if no rules match

3. Implement `processRulesForRequest(request_id, supabaseClient)` function:
   - Signature: `(request_id: UUID, supabase: SupabaseClient): ProcessResult`
   - Load maintenance_request by id
   - Load all enabled rules for landlord (priority order)
   - Call evaluateRules()
   - For each matched rule:
     - Apply actions in sequence:
       - `auto_approve`: set request.status = 'approved', request.auto_approved = true, request.auto_approved_by_rule_id = rule.id
       - `assign_vendor`: assign vendor from action params
       - `notify_landlord`: queue notification (integrate with task 127 or external service)
       - `escalate`: set request.status = 'escalated', set priority to 'emergency'
     - **Conflict resolution**: If multiple rules match and one says "auto_approve" and another says "escalate", escalate takes priority (safety first)
     - Write execution log for each matched rule
     - Update request fields: auto_approved, auto_approved_by_rule_id, rules_evaluated_at
   - Return ProcessResult with matched_rules, actions_applied, any errors

4. Conflict resolution logic:
   - If any rule action is "escalate", escalate takes priority
   - If any rule action is "auto_approve", apply after checking for escalate
   - Multiple "assign_vendor" actions: last one wins (or error if conflicting)

5. Logging:
   - Write row to rule_execution_logs for each matched rule
   - Include conditions_result (JSON with condition-by-condition details)
   - Include actions_executed (JSON with actions that ran)

6. Error handling:
   - Graceful failure if rule condition has invalid structure
   - Log errors but don't fail entire request processing
   - Return error details in ProcessResult

7. Type definitions:
   - `MatchedRule`: rule id, conditions_breakdown, actions to apply
   - `ProcessResult`: matched_rules, actions_applied, errors, updated_request

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] evaluateRules() correctly evaluates all condition types
3. [ ] Condition operators (equals, in, range, matches) work
4. [ ] AND logic for multiple conditions (all must match)
5. [ ] Rules evaluated in priority order
6. [ ] Disabled rules are skipped
7. [ ] processRulesForRequest() loads request and rules
8. [ ] auto_approve action sets request.status and request.auto_approved
9. [ ] assign_vendor action assigns vendor correctly
10. [ ] escalate action sets status to 'escalated' and priority to 'emergency'
11. [ ] Conflict resolution: escalate overrides auto_approve
12. [ ] Execution logs written for each matched rule
13. [ ] Logs include conditions_result and actions_executed (JSON)
14. [ ] Updated request saved to database
15. [ ] Error handling: invalid condition structure doesn't crash
16. [ ] Unit tests pass (task 136)
17. [ ] Ready for post-classification integration (task 125)
