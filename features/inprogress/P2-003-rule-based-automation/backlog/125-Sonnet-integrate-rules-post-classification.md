---
id: 125
title: Integrate rule evaluation into post-classification flow
tier: Sonnet
depends_on: [124]
feature: P2-003-rule-based-automation
---

# 125 — Integrate Rules into Post-Classification Flow

## Objective
Hook rule evaluation into the maintenance intake classification workflow so rules are evaluated immediately after AI classification.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

When a tenant submits a maintenance request, the AI classifies it (category, urgency, cost estimate) and writes output to maintenance_requests. This task ensures rules are evaluated on that request immediately, before landlord sees it.

## Implementation

1. Locate the post-classification flow:
   - Find where maintenance_requests.output is written after AI classification
   - Likely in `apps/web/app/api/intake/route.ts` or similar classification endpoint

2. After successful AI classification write:
   - Call `processRulesForRequest(request_id, supabaseClient)`
   - Await completion before returning response to client
   - Include rule evaluation results in response (optional, for debugging/UI feedback)

3. Update response to include:
   - Original classification output (category, urgency, cost, recommended_action)
   - Rule evaluation results (matched_rules, actions_applied)
   - Combined result (final status, auto_approved status, assigned vendor if set)

4. Error handling:
   - If rule evaluation fails, log error and continue (don't block classification)
   - Return to client with classification output (rules failure is non-critical)
   - Include error message in response for debugging

5. Testing:
   - Create test maintenance request through intake flow
   - Verify rule evaluation runs
   - Verify request status updated if rule matched
   - Verify execution logs written

6. Performance:
   - Rule evaluation should be fast (< 200ms for typical rule set)
   - If rules processing takes > 500ms, consider async processing (task for later)

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] Identified post-classification endpoint
3. [ ] processRulesForRequest() called after classification
4. [ ] Rule evaluation completes before response sent
5. [ ] Response includes rule evaluation results
6. [ ] Matched rules with action details included in response
7. [ ] Request status updated if rule matched (auto_approved, escalated, etc.)
8. [ ] auto_approved_by_rule_id set correctly
9. [ ] rules_evaluated_at timestamp set
10. [ ] Error handling: rule evaluation failure doesn't break classification
11. [ ] Manual test: Submit maintenance request, verify rules evaluated
12. [ ] Verify rule execution logs written
13. [ ] Performance: rule evaluation < 500ms
14. [ ] Intake endpoint still returns classification output (rules added, not replacing)
