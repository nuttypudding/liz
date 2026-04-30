---
id: 176
title: Unit tests — autonomy settings API routes
tier: Haiku
depends_on: [162]
feature: P3-001-autonomous-decision-making
---

# 176 — Unit Tests — Autonomy Settings API

## Objective
Write unit tests for the autonomy settings CRUD API routes (GET, PUT) with validation and default initialization.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

Comprehensive unit tests ensure the settings API is robust: defaults are created on first access, validation works, updates save correctly, and RLS prevents cross-landlord access.

## Implementation

1. Create test file: `apps/web/__tests__/api/autonomy/settings.test.ts`
2. Test suite setup:
   - Mock Supabase client or use real test database
   - Mock withAuth middleware to inject test landlord_id
   - Create test fixtures: landlord, autonomy_settings
3. Test GET handler:
   - **First access**: GET with no settings → creates defaults, returns AutonomySettings
   - **Existing settings**: GET with existing settings → returns current values
   - **Unauthenticated**: GET without auth context → 401 error
   - **Default values**: verify confidence_threshold=0.85, per_decision_cap=500, monthly_cap=5000, paused=true
4. Test PUT handler:
   - **Valid update**: PUT with all valid fields → updates all fields, returns updated settings
   - **Partial update**: PUT with subset of fields → updates only provided fields, keeps others unchanged
   - **Confidence threshold**:
     - Valid (0.7, 0.85, 0.95) → accepted
     - Invalid (-0.1, 1.5) → 400 error with message
   - **Spending caps**:
     - Valid (100, 500, 5000) → accepted
     - Invalid (0, -100) → 400 error with message
   - **Excluded categories**:
     - Valid array: ['plumbing', 'electrical'] → accepted
     - Invalid (non-array, unknown category) → 400 error
   - **Boolean fields**: toggle true/false → accepted
   - **Rollback window**:
     - Valid (0, 24, 72) → accepted
     - Invalid (73, -1) → 400 error
   - **Unauthenticated**: PUT without auth context → 401 error
5. Test error responses:
   - Verify 400 responses include field-level error details
   - Verify 500 on database error (mock DB failure)
6. Test RLS (Row Level Security):
   - Create settings for landlord A
   - Try to GET/PUT as landlord B → access denied (should not see A's settings)
7. Run tests:
   ```bash
   npm test -- autonomy/settings.test.ts
   ```

## Acceptance Criteria
1. [ ] Test file created at apps/web/__tests__/api/autonomy/settings.test.ts
2. [ ] GET creates defaults on first access
3. [ ] GET returns existing settings on subsequent calls
4. [ ] PUT updates all provided fields
5. [ ] PUT preserves unmodified fields
6. [ ] Confidence threshold validation works
7. [ ] Spending cap validation works
8. [ ] Category array validation works
9. [ ] Rollback window validation works
10. [ ] 401 returned when unauthenticated
11. [ ] 400 returned for invalid data
12. [ ] Error messages are descriptive
13. [ ] RLS prevents cross-landlord access
14. [ ] All tests pass
