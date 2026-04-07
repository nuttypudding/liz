---
id: 024
title: Unit tests for profile API routes
tier: Haiku
depends_on: [017]
feature: landlord-onboarding-decision-profile
---

# 024 — Profile API Route Tests

## Objective
Write unit tests for GET and PUT `/api/settings/profile` routes.

## Context
API route: `apps/web/app/api/settings/profile/route.ts` (created in task 017).
Zod schema: `apps/web/lib/validations.ts`
Test pattern: Follow any existing test patterns in the project (check `**/*.test.ts` or `**/*.spec.ts`).

## Implementation

1. Create `apps/web/app/api/settings/profile/__tests__/route.test.ts` (or co-located test file following project conventions).

2. Test cases for GET:
   - Returns 401 if not authenticated
   - Returns 404 if no profile exists
   - Returns 200 with profile data if exists

3. Test cases for PUT:
   - Returns 401 if not authenticated
   - Returns 400 for invalid risk_appetite value
   - Returns 400 for invalid delegation_mode value
   - Returns 400 for max_auto_approve out of range
   - Returns 200 and creates profile on first PUT
   - Returns 200 and updates profile on subsequent PUT

4. Test Zod schema validation separately:
   - Valid input passes
   - Invalid enum values rejected
   - Missing required fields rejected

## Acceptance Criteria
1. [x] Verify correct model tier (Haiku)
2. [ ] GET route tests cover auth, 404, and success cases
3. [ ] PUT route tests cover auth, validation, create, and update cases
4. [ ] Zod schema tests cover valid and invalid inputs
5. [ ] All tests pass
