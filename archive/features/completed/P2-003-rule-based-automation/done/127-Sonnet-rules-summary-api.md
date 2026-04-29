---
id: 127
title: Rules summary API — GET /api/rules/summary
tier: Sonnet
depends_on: [119]
feature: P2-003-rule-based-automation
---

# 127 — Rules Summary API

## Objective
Implement API route to fetch high-level rule statistics for dashboard display.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

The dashboard shows a summary card with rule activity. This endpoint aggregates rule and execution data.

## Implementation

1. Create route `apps/web/app/api/rules/summary/route.ts`:
   - **GET**: Fetch rules summary for authenticated landlord
     - No query parameters
     - Return RulesSummary object:
       - `active_rules`: count of rules where enabled = true
       - `auto_approved_this_month`: count of execution logs where matched = true AND actions_executed contains 'auto_approve' AND evaluated_at in last 30 days
       - `total_processed_this_month`: count of execution logs where evaluated_at in last 30 days (matched or not)

2. Calculations:
   - "This month": last 30 days from now (CURRENT_TIMESTAMP - INTERVAL '30 days')
   - active_rules: simple COUNT where landlord_id = ? AND enabled = true
   - auto_approved_this_month: COUNT execution logs where matched = true AND actions_executed JSONB contains 'auto_approve' action AND evaluated_at >= 30 days ago
   - total_processed_this_month: COUNT execution logs where evaluated_at >= 30 days ago (all logs, matched or not)

3. Scoping:
   - Only include landlord's rules and logs
   - Filter by landlord_id in WHERE clauses

4. Response includes RulesSummary:
   ```json
   {
     "active_rules": 5,
     "auto_approved_this_month": 12,
     "total_processed_this_month": 47
   }
   ```

5. Error handling:
   - 401: Unauthenticated
   - 500: Database errors

6. Performance:
   - Queries should be fast (pre-computed aggregates)
   - Consider caching result for 5–10 minutes if performance issue

7. Update `docs/endpoints.md`:
   - GET /api/rules/summary — Fetch rules summary

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] GET /api/rules/summary returns RulesSummary object
3. [ ] active_rules count is correct
4. [ ] auto_approved_this_month count only includes last 30 days
5. [ ] auto_approved_this_month only counts matched logs with auto_approve action
6. [ ] total_processed_this_month includes all logs from last 30 days
7. [ ] Only landlord's rules and logs included
8. [ ] Response includes all three summary fields
9. [ ] Unauthenticated requests return 401
10. [ ] docs/endpoints.md updated
11. [ ] Manual test: Create rules, generate execution logs, verify summary counts
12. [ ] Verify 30-day window calculation
13. [ ] Verify auto_approve action detection in JSONB
14. [ ] Query performance acceptable (< 100ms)
