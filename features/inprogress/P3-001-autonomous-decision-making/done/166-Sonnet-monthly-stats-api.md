---
id: 166
title: Monthly stats aggregation — API route + incremental stat updates
tier: Sonnet
depends_on: [160, 163]
feature: P3-001-autonomous-decision-making
---

# 166 — Monthly Stats API & Aggregation

## Objective
Build API route for monthly autonomy statistics and implement incremental stat updates on each decision.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

Monthly stats track aggregate autonomous decision performance: total decisions, dispatch rate, escalation rate, override rate, total spend, and trust score. Stats are updated incrementally as decisions are made or reviewed.

## Implementation

1. Create route file: `apps/web/app/api/autonomy/stats/route.ts`
2. Implement GET handler:
   - Authenticate with withAuth middleware
   - Accept query params: month (optional, YYYY-MM format, default current month)
   - Fetch stats record for landlord + month
   - If no record exists, compute on-the-fly from autonomous_decisions
   - Return AutonomyMonthlyStats type with full data
3. Implement monthly stats computation:
   - Count decisions with status='confirmed' and decision_type='dispatch' (auto_dispatched)
   - Count decisions with status='pending_review' or decision_type='escalate' (escalated)
   - Count decisions with status='overridden' (overridden)
   - Sum actions_taken[*].estimated_cost for total_spend
   - Calculate trust_score: 1.0 - (overridden_count / total_decisions) clamped to [0, 1]
   - Calculate confidence_avg: average of all decision confidence_scores (for reporting)
4. Implement incremental stat updates:
   - Create helper function: `updateMonthlyStats(landlord_id, month, delta)`
   - Delta contains: +1 to total_decisions, +1 to auto_dispatched if dispatch, +1 to escalated if escalate, etc.
   - Call this function whenever a decision is created (POST /api/autonomy/decisions)
   - Call this function whenever a decision is reviewed/overridden (PATCH /api/autonomy/decisions/[id])
5. Upsert logic:
   - If stats record exists for month, increment fields
   - If no record exists, create with counts=1 for relevant fields
6. Recalculate trust_score on each update
7. Error handling:
   - 401 if unauthenticated
   - 400 if month format invalid
   - 500 on database error

## Acceptance Criteria
1. [ ] GET route returns stats for requested month
2. [ ] Stats computed from autonomous_decisions if record doesn't exist
3. [ ] total_decisions counted correctly
4. [ ] auto_dispatched counted (decision_type='dispatch' + status='confirmed')
5. [ ] escalated counted (decision_type='escalate')
6. [ ] overridden counted (status='overridden')
7. [ ] total_spend summed from cost estimates
8. [ ] trust_score calculated as 1 - (overridden / total)
9. [ ] Incremental updates work on decision creation
10. [ ] Incremental updates work on decision review
11. [ ] Month param validated (YYYY-MM format)
12. [ ] Stats record upserted (created or updated)
13. [ ] Trust score stays in [0, 1] range
