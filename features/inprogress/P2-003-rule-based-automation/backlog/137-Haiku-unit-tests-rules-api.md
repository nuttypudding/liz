---
id: 137
title: Unit tests for rules API routes
tier: Haiku
depends_on: [121, 122, 123]
feature: P2-003-rule-based-automation
---

# 137 — Unit Tests for Rules API Routes

## Objective
Create comprehensive unit tests for all rules API endpoints (CRUD, reorder, test).

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

API routes handle all rule management. Tests ensure correct behavior, validation, auth, and error handling.

## Implementation

1. Create test file: `apps/web/app/api/rules/__tests__/routes.test.ts` (or separate files per route)

2. Test Suite for GET /api/rules:
   - Test 1: Authenticated user can list rules
   - Test 2: Rules sorted by priority (ascending)
   - Test 3: Returns empty array when no rules
   - Test 4: Each rule includes times_matched, last_matched_at
   - Test 5: Unauthenticated request returns 401
   - Test 6: User only sees their own rules (landlord scoping)

3. Test Suite for POST /api/rules:
   - Test 1: Create rule with valid payload
   - Test 2: Created rule has auto-assigned priority (next available)
   - Test 3: Invalid payload returns 400 with validation error
   - Test 4: Exceeding 25-rule limit returns 400
   - Test 5: Name required field
   - Test 6: Conditions required (at least 1)
   - Test 7: Actions required (at least 1)
   - Test 8: Name must be unique per landlord (duplicate name returns 400)
   - Test 9: Unauthenticated request returns 401
   - Test 10: Created rule belongs to authenticated landlord

4. Test Suite for GET /api/rules/[id]:
   - Test 1: Fetch rule by id
   - Test 2: Rule includes full data (conditions, actions, etc.)
   - Test 3: Non-existent rule returns 404
   - Test 4: Unauthorized access (other landlord's rule) returns 403
   - Test 5: Unauthenticated request returns 401

5. Test Suite for PUT /api/rules/[id]:
   - Test 1: Update rule with partial payload
   - Test 2: Update name field
   - Test 3: Update conditions field
   - Test 4: Update actions field
   - Test 5: Invalid payload returns 400
   - Test 6: Non-existent rule returns 404
   - Test 7: Unauthorized access returns 403
   - Test 8: Updated rule preserves other fields

6. Test Suite for DELETE /api/rules/[id]:
   - Test 1: Delete rule returns 204 No Content
   - Test 2: Deleted rule no longer in list
   - Test 3: Execution logs preserved after delete
   - Test 4: Non-existent rule returns 404
   - Test 5: Unauthorized access returns 403

7. Test Suite for PATCH /api/rules/[id]/reorder:
   - Test 1: Reorder rule to higher priority
   - Test 2: Reorder rule to lower priority
   - Test 3: Other rules' priorities adjusted
   - Test 4: Invalid new_priority returns 400
   - Test 5: Out of range priority returns 400
   - Test 6: Non-integer priority returns 400
   - Test 7: Non-existent rule returns 404
   - Test 8: Unauthorized access returns 403
   - Test 9: Concurrent reorder handled safely

8. Test Suite for POST /api/rules/[id]/test:
   - Test 1: Test rule with matching data returns matched: true
   - Test 2: Test rule with non-matching data returns matched: false
   - Test 3: Response includes conditions_breakdown array
   - Test 4: conditions_breakdown shows each condition with match status
   - Test 5: Response includes actions_preview array
   - Test 6: Invalid test payload returns 400
   - Test 7: Non-existent rule returns 404
   - Test 8: Unauthorized access returns 403

9. Test Fixtures:
   - Sample valid rule payloads
   - Invalid payloads (missing required fields, invalid types, etc.)
   - Sample maintenance requests for testing
   - Mock Supabase client and auth context

10. Test Framework:
    - Use Jest + @testing-library/react or similar
    - Mock Supabase client (database, auth)
    - Mock withAuth middleware to inject test user context
    - Use test database or in-memory database if available

11. Running Tests:
    - Command: `npm run test -- routes.test.ts`
    - All tests pass before merging

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] Test file created for rules API routes
3. [ ] GET /api/rules: list, sort, empty array tests pass
4. [ ] GET /api/rules: auth scoping tested
5. [ ] POST /api/rules: create, validation, 25-rule limit tests pass
6. [ ] POST /api/rules: unique name per landlord tested
7. [ ] GET /api/rules/[id]: fetch, 404, 403 tests pass
8. [ ] PUT /api/rules/[id]: update, partial payload, 404, 403 tests pass
9. [ ] DELETE /api/rules/[id]: delete, 204 response, logs preserved tests pass
10. [ ] PATCH /api/rules/[id]/reorder: reorder, priority shift tests pass
11. [ ] POST /api/rules/[id]/test: match/no-match, breakdown, preview tests pass
12. [ ] All auth tests pass (401 for unauth, 403 for unauthorized)
13. [ ] All validation tests pass (400 for invalid input)
14. [ ] All error handling tests pass (404 for not found)
15. [ ] All tests pass
16. [ ] Test coverage > 85%
17. [ ] Tests run in < 30 seconds
18. [ ] No flaky tests (deterministic)
