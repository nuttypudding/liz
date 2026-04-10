---
id: 121
title: Rules CRUD API routes — GET/POST /api/rules, GET/PUT/DELETE /api/rules/[id]
tier: Sonnet
depends_on: [119, 120]
feature: P2-003-rule-based-automation
---

# 121 — Rules CRUD API Routes

## Objective
Implement full CRUD API routes for managing automation rules with auth and validation.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

These routes are the primary interface for creating, reading, updating, and deleting rules. All operations must be scoped to the authenticated landlord.

## Implementation

1. Create route `apps/web/app/api/rules/route.ts`:
   - **GET**: List all rules for authenticated landlord
     - Return array of rules sorted by priority (ascending)
     - Include times_matched, last_matched_at for analytics
     - Paginate if >100 rules (unlikely, but safe)
   - **POST**: Create new rule
     - Validate payload against ZodAutomationRuleCreate
     - Enforce 25-rule limit per landlord (check count, return 400 if exceeded)
     - Auto-set priority to next available (max_priority + 1)
     - Return created rule with 201 status

2. Create route `apps/web/app/api/rules/[id]/route.ts`:
   - **GET**: Fetch single rule by id
     - Verify landlord ownership
     - Include execution log stats (times_matched, last_matched_at)
   - **PUT**: Update rule
     - Validate payload against ZodAutomationRuleUpdate
     - Verify landlord ownership
     - Update only provided fields
     - Return updated rule with 200 status
   - **DELETE**: Soft or hard delete
     - Verify landlord ownership
     - Delete rule record
     - Preserve execution logs for audit
     - Return 204 No Content

3. Wrap all routes with `withAuth(landlord)` middleware:
   - Ensure only authenticated landlords can access
   - Bind landlord_id from auth context to all queries

4. Error handling:
   - 400: Validation errors, 25-rule limit exceeded
   - 401: Unauthenticated
   - 403: Landlord not owner of rule
   - 404: Rule not found
   - 500: Database errors

5. Update `docs/endpoints.md`:
   - GET /api/rules — List rules
   - POST /api/rules — Create rule
   - GET /api/rules/[id] — Get rule
   - PUT /api/rules/[id] — Update rule
   - DELETE /api/rules/[id] — Delete rule

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] GET /api/rules returns list of rules for authenticated landlord
3. [ ] POST /api/rules creates rule and enforces 25-rule limit
4. [ ] GET /api/rules/[id] returns single rule with ownership check
5. [ ] PUT /api/rules/[id] updates rule with validation
6. [ ] DELETE /api/rules/[id] deletes rule with ownership check
7. [ ] All routes use withAuth(landlord) middleware
8. [ ] Validation errors return 400 with schema violation details
9. [ ] Ownership checks return 403 for unauthorized access
10. [ ] 404 returned for non-existent rules
11. [ ] docs/endpoints.md updated with all 5 endpoints
12. [ ] Manual test: Create, read, update, delete a rule
13. [ ] Verify 25-rule limit enforcement
14. [ ] Response times acceptable (< 500ms)
