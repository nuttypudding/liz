---
id: 177
title: Unit tests — autonomous decisions API routes
tier: Haiku
depends_on: [163]
feature: P3-001-autonomous-decision-making
---

# 177 — Unit Tests — Autonomous Decisions API

## Objective
Write unit tests for the autonomous decisions API routes (GET, POST, PATCH) covering listing, creation, and review actions.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

Comprehensive unit tests ensure the decisions API correctly manages the decision feed, creates records, and processes landlord reviews/overrides.

## Implementation

1. Create test file: `apps/web/__tests__/api/autonomy/decisions.test.ts`
2. Test suite setup:
   - Mock Supabase or use test database
   - Mock withAuth middleware to inject test landlord_id
   - Create test fixtures: landlord, request, decisions
3. Test GET handler (list/feed):
   - **Basic list**: GET /api/autonomy/decisions → returns paginated decisions
   - **Pagination**: GET with limit=10, offset=5 → returns correct page
   - **Filter by status**: GET ?status=pending_review → returns only pending decisions
   - **Filter by status**: GET ?status=confirmed → returns only confirmed decisions
   - **Sort order**: GET ?sort=created_at → ascending; GET ?sort=-created_at → descending
   - **Default limit**: GET (no limit param) → defaults to 20
   - **Max limit**: GET ?limit=100 → capped at 50 (if enforced)
   - **Total count**: response includes total for pagination UI
   - **Unauthenticated**: GET without auth → 401 error
   - **RLS**: create decisions for landlord A, list as landlord B → returns empty (no access)
4. Test POST handler (create):
   - **Valid create**:
     - POST with { request_id, decision_type='dispatch', confidence_score=0.85, reasoning, factors, safety_checks, actions_taken }
     - → creates record with status='pending_review'
     - → returns created decision with id and timestamps
   - **Valid decision_type**: 'dispatch', 'escalate', 'hold' → all accepted
   - **Invalid decision_type**: POST with 'invalid' → 400 error
   - **Confidence score validation**:
     - Valid (0, 0.5, 1.0) → accepted
     - Invalid (-0.1, 1.5) → 400 error
   - **Missing fields**:
     - Missing request_id → 400 error
     - Missing decision_type → 400 error
     - Missing confidence_score → 400 error
   - **Status always pending_review**: created decision has status='pending_review'
   - **Timestamps set**: created_at, updated_at are set on creation
   - **Unauthenticated**: POST without auth → 401 error
5. Test PATCH handler (review):
   - **Valid confirm**: PATCH /[id] with { review_action='confirmed', review_notes='' } → status becomes 'confirmed', reviewed_at set
   - **Valid override**: PATCH /[id] with { review_action='overridden', review_notes='Too costly' } → status becomes 'overridden', review_notes saved
   - **Invalid review_action**: PATCH with 'invalid' → 400 error
   - **Review notes optional**: PATCH with review_action='confirmed' (no review_notes) → accepted
   - **Only pending_review can be updated**: create confirmed decision, try to PATCH → 400 or no-op
   - **reviewed_at set**: after PATCH, reviewed_at timestamp is present
   - **Unauthenticated**: PATCH without auth → 401 error
   - **Not found**: PATCH nonexistent ID → 404 error
   - **RLS**: create decision for landlord A, PATCH as landlord B → 404 or access denied
6. Run tests:
   ```bash
   npm test -- autonomy/decisions.test.ts
   ```

## Acceptance Criteria
1. [ ] Test file created at apps/web/__tests__/api/autonomy/decisions.test.ts
2. [ ] GET returns paginated list
3. [ ] GET filters by status correctly
4. [ ] GET respects sort order
5. [ ] GET uses correct default/max limits
6. [ ] POST creates decision with pending_review status
7. [ ] POST validates decision_type enum
8. [ ] POST validates confidence_score (0-1)
9. [ ] POST requires all mandatory fields
10. [ ] POST sets timestamps
11. [ ] PATCH updates status to confirmed
12. [ ] PATCH updates status to overridden
13. [ ] PATCH saves review_notes
14. [ ] PATCH sets reviewed_at timestamp
15. [ ] 400 returned for invalid data
16. [ ] 401 returned when unauthenticated
17. [ ] 404 returned for nonexistent decisions
18. [ ] RLS prevents cross-landlord access
19. [ ] All tests pass
