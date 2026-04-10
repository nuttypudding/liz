---
id: 126
title: Rule execution logs API — GET /api/rules/logs
tier: Sonnet
depends_on: [119]
feature: P2-003-rule-based-automation
---

# 126 — Rule Execution Logs API

## Objective
Implement API route to query rule execution logs for audit trail and analytics.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

Logs track which rules have matched on which requests, what conditions were evaluated, and what actions were executed. Used for auditing and understanding rule behavior.

## Implementation

1. Create route `apps/web/app/api/rules/logs/route.ts`:
   - **GET**: Query rule execution logs
     - Required auth: authenticated landlord
     - Query parameters (all optional):
       - `request_id`: filter by specific maintenance request
       - `rule_id`: filter by specific rule
       - `from_date`: ISO 8601 timestamp (inclusive)
       - `to_date`: ISO 8601 timestamp (inclusive)
       - `matched_only`: boolean (default false) — only return matched rules
       - `limit`: number (default 50, max 250)
       - `offset`: number (default 0)
     - Return array of RuleExecutionLog objects:
       - id, request_id, rule_id, matched (boolean), conditions_result (JSON), actions_executed (JSON), evaluated_at
       - Include rule name and request category for readability
     - Paginate by limit/offset
     - Sort by evaluated_at descending (newest first)

2. Scoping:
   - Only return logs for rules owned by authenticated landlord
   - Filter by landlord_id in WHERE clause

3. Filters:
   - request_id: exact match
   - rule_id: exact match
   - from_date/to_date: timestamp range (evaluated_at BETWEEN)
   - matched_only: WHERE matched = true

4. Response includes:
   - Array of logs with full details
   - Total count (for pagination)
   - Pagination info (limit, offset, has_more)

5. Error handling:
   - 400: Invalid query parameters (bad date format, limit > 250)
   - 401: Unauthenticated
   - 500: Database errors

6. Update `docs/endpoints.md`:
   - GET /api/rules/logs — Query rule execution logs

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] GET /api/rules/logs returns list of logs for authenticated landlord
3. [ ] Filter by request_id works
4. [ ] Filter by rule_id works
5. [ ] Filter by date range (from_date, to_date) works
6. [ ] matched_only filter returns only matched=true logs
7. [ ] Pagination by limit/offset works
8. [ ] Limit default 50, max 250
9. [ ] Sorted by evaluated_at descending
10. [ ] Only logs for landlord's rules returned
11. [ ] Invalid parameters return 400
12. [ ] Response includes total count and pagination info
13. [ ] docs/endpoints.md updated
14. [ ] Manual test: Create rule, generate log entries, query with various filters
15. [ ] Verify date range filtering accuracy
16. [ ] Verify offset/limit pagination
