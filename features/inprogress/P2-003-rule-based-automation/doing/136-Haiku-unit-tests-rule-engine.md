---
id: 136
title: Unit tests for rule evaluation engine
tier: Haiku
depends_on: [124]
feature: P2-003-rule-based-automation
---

# 136 — Unit Tests for Rule Evaluation Engine

## Objective
Create comprehensive unit tests for the rule evaluation engine (evaluateRules and processRulesForRequest functions).

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

The rule engine is critical to the feature. Tests ensure condition evaluation, conflict resolution, and action execution work correctly.

## Implementation

1. Create test file: `apps/web/lib/rules/__tests__/engine.test.ts`

2. Test Suite for `evaluateRules()`:
   - Test 1: Single condition match (category equals plumbing)
   - Test 2: Single condition no match
   - Test 3: Multiple conditions all match (AND logic)
   - Test 4: Multiple conditions, one fails (AND logic)
   - Test 5: Condition operators:
     - equals operator
     - in operator (array)
     - range operator (numeric)
     - matches operator (string pattern)
   - Test 6: Disabled rule skipped (rule.enabled = false)
   - Test 7: Rules evaluated in priority order (ascending)
   - Test 8: Empty rules array (no rules to evaluate)
   - Test 9: Cost range condition with boundary values (exact min, exact max, within, outside)
   - Test 10: Property selector condition with single and multiple properties
   - Test 11: Vendor available condition with multiple vendors

3. Test Suite for `processRulesForRequest()`:
   - Test 1: No rules matched (matched_rules empty)
   - Test 2: One rule matched, auto-approve action
   - Test 3: One rule matched, assign vendor action
   - Test 4: One rule matched, escalate action
   - Test 5: One rule matched, notify landlord action
   - Test 6: Multiple rules matched (process all)
   - Test 7: Conflict resolution: escalate overrides auto_approve
   - Test 8: Conflict resolution: escalate + assign_vendor (both apply)
   - Test 9: Request updated with auto_approved flag
   - Test 10: Request updated with auto_approved_by_rule_id
   - Test 11: Request updated with rules_evaluated_at timestamp
   - Test 12: Execution log written for matched rule
   - Test 13: Execution log written with conditions_result JSON
   - Test 14: Execution log written with actions_executed JSON
   - Test 15: Error handling: invalid condition structure (graceful failure)
   - Test 16: Error handling: non-existent request_id (returns error)

4. Test Fixtures:
   - Sample rules with various condition/action combinations
   - Sample maintenance requests (different categories, urgencies, costs)
   - Mock Supabase client

5. Test Framework:
   - Use Jest (likely already configured in project)
   - Use @testing-library or similar for mocking Supabase
   - Mock database calls to avoid hitting test/production DB

6. Test Coverage:
   - Aim for > 95% coverage of engine.ts
   - All branches of conditional logic tested
   - Edge cases covered (boundaries, empty arrays, null values)

7. Running Tests:
   - Command: `npm run test -- engine.test.ts` (or similar)
   - All tests pass before merging

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] Test file created at apps/web/lib/rules/__tests__/engine.test.ts
3. [ ] All evaluateRules() scenarios tested (condition types, operators, logic)
4. [ ] All processRulesForRequest() scenarios tested (actions, conflicts, logging)
5. [ ] Disabled rules correctly skipped
6. [ ] Priority order respected
7. [ ] Conflict resolution tested (escalate overrides auto_approve)
8. [ ] Request fields updated correctly (auto_approved, rule_id, timestamp)
9. [ ] Execution logs written with correct data
10. [ ] Error handling tested (invalid structure, missing request)
11. [ ] Boundary values tested (cost ranges, etc.)
12. [ ] All tests pass
13. [ ] Test coverage > 90%
14. [ ] Tests run in < 10 seconds
15. [ ] No flaky tests (deterministic results)
