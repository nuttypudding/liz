---
id: 179
title: Unit tests — monthly stats aggregation
tier: Haiku
depends_on: [166]
feature: P3-001-autonomous-decision-making
---

# 179 — Unit Tests — Monthly Stats Aggregation

## Objective
Write unit tests for monthly stats aggregation: calculation of decision counts, spend totals, trust score, and incremental updates.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

Unit tests verify that stats are accurately computed from autonomous decisions and updated correctly as new decisions are made or reviewed.

## Implementation

1. Create test file: `apps/web/__tests__/api/autonomy/stats.test.ts`
2. Test suite setup:
   - Mock Supabase or use test database
   - Mock withAuth middleware
   - Create test fixtures: landlord, autonomy_settings, decisions
3. Test GET handler (fetch/compute stats):
   - **Existing stats record**: GET ?month=2024-04 with existing record → returns record with all counts
   - **Compute on-the-fly**: GET ?month=2024-04 with no record → computes from decisions, returns AutonomyMonthlyStats
   - **Month param format**: GET ?month=2024-04 (YYYY-MM) → accepted; GET ?month=04-2024 → 400 error
   - **Default month**: GET (no month param) → uses current month
   - **Unauthenticated**: GET without auth → 401 error
4. Test stat computation:
   - **total_decisions**: count of all decisions (any status, any decision_type) for the month
   - **auto_dispatched**: count of decisions with decision_type='dispatch' and status='confirmed'
   - **escalated**: count of decisions with decision_type='escalate'
   - **overridden**: count of decisions with status='overridden'
   - **total_spend**: sum of estimated_cost from actions_taken[*] for all decisions
   - **trust_score**: 1.0 - (overridden / total_decisions), clamped to [0, 1]
     - Example: 10 total, 2 overridden → trust_score = 1.0 - (2/10) = 0.8
     - Example: 0 total → trust_score = 1.0 (or 0? clarify)
     - Example: 10 total, 10 overridden → trust_score = 0
5. Test incremental updates:
   - **Create decision**: POST new decision → increments total_decisions, auto_dispatched or escalated
   - **Confirm decision**: PATCH with status='confirmed' → increments auto_dispatched
   - **Override decision**: PATCH with status='overridden' → increments overridden
   - **Upsert logic**: if stats record doesn't exist, create it; if exists, increment fields
   - **Trust score recalculated**: after each override, trust_score updated
6. Test edge cases:
   - **No decisions**: stats for month with 0 decisions → all counts=0, trust_score=1.0 (or handle gracefully)
   - **All overridden**: 5 decisions, all overridden → trust_score=0
   - **No overrides**: 5 decisions, none overridden → trust_score=1.0
   - **Timezone handling**: stats grouped by month in landlord's timezone (if applicable)
   - **Month boundary**: decision created on last day of month, another on first day of next month → correct month assignment
7. Test filtering:
   - Stats only include decisions for the requested month
   - Stats don't include decisions from other months or other landlords
8. Run tests:
   ```bash
   npm test -- autonomy/stats.test.ts
   ```

## Acceptance Criteria
1. [ ] Test file created at apps/web/__tests__/api/autonomy/stats.test.ts
2. [ ] GET returns existing stats record
3. [ ] GET computes stats on-the-fly if record doesn't exist
4. [ ] Month param validated (YYYY-MM format)
5. [ ] total_decisions counts correctly
6. [ ] auto_dispatched counts decisions with decision_type='dispatch'
7. [ ] escalated counts decisions with decision_type='escalate'
8. [ ] overridden counts decisions with status='overridden'
9. [ ] total_spend summed correctly
10. [ ] trust_score calculated as 1 - (overridden / total)
11. [ ] trust_score clamped to [0, 1]
12. [ ] Incremental updates work on decision creation
13. [ ] Incremental updates work on decision review
14. [ ] Upsert logic creates or updates record
15. [ ] Trust score recalculated on each update
16. [ ] Edge cases handled (0 decisions, all overridden, etc.)
17. [ ] Month filtering correct
18. [ ] RLS prevents cross-landlord access
19. [ ] All tests pass
