---
id: 228
title: Unit tests — jurisdiction rules lookup, compliance score calculation
tier: Haiku
depends_on: [211, 212]
feature: P3-003-legal-compliance-engine
---

# 228 — Unit Tests: Jurisdiction and Score Calculation

## Objective
Create unit tests for jurisdiction rules lookup and compliance score calculation logic. Verify that jurisdictions are matched correctly, scores are calculated accurately, and checklist generation works as expected.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Unit tests ensure the compliance engine's core logic is bulletproof. Jurisdiction matching and score calculation are critical paths that must be thoroughly tested.

## Implementation

1. **Test file** — `apps/web/lib/compliance/__tests__/jurisdiction.test.ts`
   - Test jurisdiction lookup functions

2. **Test suite: getJurisdictionRules**
   - Test: Returns all rules for a given state
     - Inputs: state_code="CA"
     - Expected: All CA rules (both statewide + CA city rules)
   - Test: Returns rules filtered by state + city
     - Inputs: state_code="CA", city="San Francisco"
     - Expected: CA statewide rules + SF-specific rules (SF takes precedence for duplicates)
   - Test: Returns empty array for invalid state
     - Inputs: state_code="XZ" (invalid)
     - Expected: Empty array, no error
   - Test: Returns rules filtered by topic
     - Inputs: state_code="CA", topic="notice_period_entry"
     - Expected: Only rules with that topic
   - Test: Handles missing city gracefully
     - Inputs: state_code="CA", city="NonexistentCity"
     - Expected: Only CA statewide rules (city rules don't exist)

3. **Test suite: generateChecklistItems**
   - Test: Creates checklist items for all required topics
     - Setup: Property with jurisdiction CA/SF
     - Inputs: property_id, jurisdiction
     - Expected: One checklist item per unique topic in jurisdiction rules
   - Test: Assigns correct description from rules
     - Setup: Rule with specific topic and description
     - Expected: Generated item has rule description
   - Test: Initializes all items as incomplete
     - Expected: All items have completed=false, completed_at=null
   - Test: Handles duplicate topics correctly
     - Setup: Both CA and SF rules with same topic
     - Expected: Only one checklist item per topic (no duplicates)
   - Test: Returns empty array if no rules for jurisdiction
     - Setup: Property with jurisdiction for empty state
     - Expected: Empty array

4. **Test file** — `apps/web/lib/compliance/__tests__/score.test.ts`
   - Test compliance score calculation

5. **Test suite: calculateComplianceScore**
   - Test: Calculates correct score (0-100)
     - Setup: 4 total items, 3 completed
     - Expected: score = 75
   - Test: Returns 100 when all items complete
     - Setup: 4 items, 4 completed
     - Expected: score = 100
   - Test: Returns 0 when no items complete
     - Setup: 4 items, 0 completed
     - Expected: score = 0
   - Test: Rounds to nearest integer
     - Setup: 3 items, 2 completed (66.666%)
     - Expected: score = 67 (rounded)
   - Test: Handles zero required items
     - Setup: 0 total items
     - Expected: score = 0 (or handle gracefully)
   - Test: Returns missing items correctly
     - Setup: 4 items (2 complete, 2 incomplete)
     - Expected: missing_items array with 2 items

6. **Test suite: updateChecklistItem**
   - Test: Marks item as complete
     - Setup: Incomplete item
     - Expected: completed=true, completed_at set to now
   - Test: Marks item as incomplete
     - Setup: Complete item
     - Expected: completed=false, completed_at=null
   - Test: Doesn't allow invalid item IDs
     - Inputs: Non-existent item_id
     - Expected: Error (404 or throws)
   - Test: Recalculates score after update
     - Setup: Complete one item, fetch score
     - Expected: Score increases accordingly

7. **Test file** — `apps/web/lib/compliance/__tests__/api-integration.test.ts`
   - Integration tests for API routes

8. **Test suite: GET /api/compliance/[propertyId]/score**
   - Test: Returns correct score structure
     - Setup: Property with 3 of 4 items complete
     - Expected: { score: 75, completed_count: 3, total_required_count: 4, missing_items: [...] }
   - Test: Returns 400 if jurisdiction not configured
     - Setup: Property with no jurisdiction
     - Expected: 400 error, message: "Jurisdiction not configured"
   - Test: Returns 404 if property not found
     - Inputs: Invalid property_id
     - Expected: 404 error
   - Test: Enforces authorization
     - Setup: User A's property, requesting as User B
     - Expected: 403 Forbidden

9. **Test suite: PATCH /api/compliance/[propertyId]/checklist/[itemId]**
   - Test: Updates item completion status
     - Inputs: { completed: true }
     - Expected: Item updated, completed_at set
   - Test: Returns updated item
     - Expected: Response includes updated item with all fields
   - Test: Validates completed is boolean
     - Inputs: { completed: "true" } (string, not boolean)
     - Expected: 400 Bad Request
   - Test: Returns 404 for non-existent item
     - Inputs: Invalid item_id
     - Expected: 404 error

10. **Test file** — `apps/web/lib/compliance/__tests__/edge-cases.test.ts`
    - Edge cases and boundary conditions

11. **Test suite: Edge cases**
    - Test: Jurisdiction with no rules
      - Setup: Valid jurisdiction with 0 rules in database
      - Expected: Score calculation still works (0 required = score 0)
    - Test: Property with multiple jurisdiction updates
      - Setup: Update property jurisdiction twice
      - Expected: Checklist items regenerated each time (old items removed or updated)
    - Test: Concurrent score calculations
      - Setup: Multiple requests for same property score
      - Expected: All return correct result (no race conditions)
    - Test: Very large checklist (100+ items)
      - Setup: Property with many required topics
      - Expected: Score calculated correctly, no performance issues

12. **Test utilities**:
    - Create `apps/web/lib/compliance/__tests__/fixtures.ts` with mock data:
      - Mock jurisdiction_rules
      - Mock property data
      - Mock checklist items
      - Helper to create test properties with known jurisdictions

13. **Running tests**:
    - Command: `npm run test -- compliance`
    - Or: `npm run test` (if running full suite)
    - Verify all tests pass

## Acceptance Criteria
1. [ ] Unit test file for jurisdiction lookup created
2. [ ] Tests: getJurisdictionRules with various filters
3. [ ] Tests: generateChecklistItems from rules
4. [ ] Unit test file for score calculation created
5. [ ] Tests: calculateComplianceScore with various completion rates
6. [ ] Tests: Missing items returned correctly
7. [ ] Integration test file for API routes created
8. [ ] Tests: GET /api/compliance/[propertyId]/score endpoint
9. [ ] Tests: PATCH /api/compliance/[propertyId]/checklist/[itemId] endpoint
10. [ ] Edge case tests: No rules, concurrent requests, large checklists
11. [ ] Mock fixtures created for test data
12. [ ] All tests pass (100% passing)
13. [ ] Test coverage ≥80% for compliance logic
14. [ ] No console errors or warnings in tests
