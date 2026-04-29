---
id: 134
title: Decision profile fallback integration — rules override profile when present
tier: Sonnet
depends_on: [124, 125]
feature: P2-003-rule-based-automation
---

# 134 — Decision Profile Fallback Integration

## Objective
Ensure rule actions take priority over decision profile fallback behavior when rules match, and fall back to decision profile when no rules match.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

Phase 1 feature (P1-003-decision-profile) defines fallback behavior when no rules match: delegation_mode (auto-approve vs. escalate) and max_auto_approve threshold. Rules should override this behavior when they match.

## Implementation

1. Identify decision profile integration point:
   - Locate where decision profile is currently applied (post-classification)
   - Likely in maintenance intake response or post-classification hook
   - Reference: `features/inprogress/P1-003-decision-profile/` for current implementation

2. Update rule evaluation to check decision profile:
   - If no rules match, fall back to decision profile behavior
   - In processRulesForRequest() (task 124):
     - If matched_rules is empty array:
       - Load landlord's decision profile
       - Apply delegation_mode logic:
         - If delegation_mode = 'auto_approve': auto-approve request
         - If delegation_mode = 'escalate': escalate request
       - Check max_auto_approve threshold (e.g., don't auto-approve if cost > max_auto_approve)
       - Apply decision profile logic like a fallback rule

3. Priority Order:
   1. Rule engine (if rules match, use rule actions — skip decision profile)
   2. Decision profile (if no rules match, use decision profile as fallback)
   3. Default (if no rules and no decision profile, keep request in review status)

4. Implementation Detail:
   - In processRulesForRequest():
     ```
     if (matched_rules.length === 0) {
       // No rules matched, apply decision profile fallback
       const profile = await loadDecisionProfile(landlord_id);
       if (profile) {
         // Apply profile logic
         return applyDecisionProfileFallback(request, profile);
       }
     }
     // Rules matched, use their actions (already applied above)
     return result;
     ```

5. Logging:
   - Write execution log entry with source_type: 'decision_profile' when using fallback
   - Distinguish from rule-based logs in audit trail

6. Testing:
   - Test with rules matching: verify rules take priority
   - Test without rules, with profile: verify profile applied
   - Test without rules, without profile: verify no auto action

7. Documentation:
   - Update feature README to explain priority order
   - Note: Rules override decision profile

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] Rule evaluation engine checks for matched rules first
3. [ ] If rules matched: use rule actions (ignore decision profile)
4. [ ] If rules not matched: fall back to decision profile
5. [ ] Decision profile loads correctly
6. [ ] Decision profile delegation_mode applied (auto_approve or escalate)
7. [ ] Decision profile max_auto_approve threshold honored
8. [ ] Execution logs distinguish rule-based vs. profile-based actions
9. [ ] If no rules and no profile: request stays in review
10. [ ] Manual testing: create rule, verify it overrides profile
11. [ ] Manual testing: no rule match, verify profile applied
12. [ ] Verify no conflicts between rule and profile logic
13. [ ] Performance: fallback logic fast (< 100ms)
14. [ ] Integration with post-classification flow (task 125) works
15. [ ] Feature README updated with priority order explanation
