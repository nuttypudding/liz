---
id: 123
title: Rule test API route — POST /api/rules/[id]/test
tier: Sonnet
depends_on: [120, 121]
feature: P2-003-rule-based-automation
---

# 123 — Rule Test API Route

## Objective
Implement API route to test a rule against sample request data without evaluating it on real requests.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

This route allows users to validate rule logic before enabling it. Returns condition-by-condition breakdown and action preview.

## Implementation

1. Create route `apps/web/app/api/rules/[id]/test/route.ts`:
   - **POST**: Test rule against sample data
     - Payload: RuleTestRequest (category, urgency, cost, property_id, vendor_ids)
     - Verify landlord ownership of rule
     - Call rule evaluation engine (task 124) with sample data
     - Return RuleTestResponse with:
       - `matched`: boolean (overall result)
       - `conditions_breakdown`: array of ConditionResult objects
         - condition_index
         - matched: true/false
         - details: stringified condition evaluation (e.g., "category matches electrical")
       - `actions_preview`: array of action descriptions (what would happen if matched)

2. Rule evaluation:
   - Use evaluateRules() function (from task 124) to check conditions
   - Does NOT execute actions or modify data
   - Returns detailed breakdown for UI display

3. Validation:
   - Payload validated against ZodRuleTestRequest
   - Rule must exist and belong to authenticated landlord

4. Error handling:
   - 400: Invalid test payload
   - 401: Unauthenticated
   - 403: Landlord not owner
   - 404: Rule not found
   - 500: Evaluation errors

5. Update `docs/endpoints.md`:
   - POST /api/rules/[id]/test — Test rule against sample data

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] POST /api/rules/[id]/test accepts RuleTestRequest payload
3. [ ] Ownership verification enforced
4. [ ] Rule conditions evaluated against sample data
5. [ ] Returns matched: boolean
6. [ ] Conditions breakdown includes all conditions with match status
7. [ ] Actions preview shows what would execute (without executing)
8. [ ] Invalid payload returns 400
9. [ ] Non-existent rule returns 404
10. [ ] docs/endpoints.md updated
11. [ ] Manual test: Create rule with multiple conditions, test with matching and non-matching data
12. [ ] Verify conditions_breakdown accuracy
13. [ ] Verify actions_preview matches rule definition
14. [ ] Sample data doesn't modify database or maintenance_requests
