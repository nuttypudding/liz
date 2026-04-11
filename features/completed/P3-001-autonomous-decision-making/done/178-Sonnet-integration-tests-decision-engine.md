---
id: 178
title: Integration tests — decision engine end-to-end flow
tier: Sonnet
depends_on: [164, 165]
feature: P3-001-autonomous-decision-making
---

# 178 — Integration Tests — Decision Engine

## Objective
Write end-to-end integration tests for the full autonomous decision flow: request classification → engine evaluation → decision recording → status update.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

Integration tests verify that the decision engine integrates correctly with the dispatch pipeline and produces the expected outcomes.

## Implementation

1. Create test file: `apps/web/__tests__/integration/autonomy-flow.test.ts`
2. Test suite setup:
   - Use test database (real Supabase instance or in-memory)
   - Create test fixtures: landlord with settings, request, vendors
   - Mock Claude API calls (or use real API with test prompts)
3. Test full autonomy flow:
   - **Scenario 1: Auto-dispatch (high confidence)**
     - Create landlord with delegation_mode='autopilot', autonomy_settings (confidence_threshold=0.85)
     - Submit maintenance request: "Kitchen sink leak" (plumbing, medium urgency)
     - Engine evaluates → confidence=0.92 (high historical success)
     - Expected: decision.decision_type='dispatch', decision.status='pending_review'
     - Expected: request status updated
     - Expected: decision record created in autonomous_decisions table
     - Expected: decision.factors show weighted breakdown
   - **Scenario 2: Escalate (low confidence)**
     - Create landlord with confidence_threshold=0.85
     - Submit request: "Structural damage assessment" (structural, high urgency)
     - Engine evaluates → confidence=0.65 (low, complex work)
     - Expected: decision.decision_type='escalate', decision.status='pending_review'
     - Expected: request status='awaiting_landlord_review'
   - **Scenario 3: Emergency auto-dispatch**
     - Create landlord with emergency_auto_dispatch=true
     - Submit request: urgency='emergency', category='electrical'
     - Engine evaluates → confidence=0.75 (normally below threshold)
     - Expected: decision.decision_type='dispatch' (overrides threshold due to emergency)
     - Expected: dispatch proceeds despite lower confidence
   - **Scenario 4: Spending cap violation**
     - Create landlord with monthly_cap=1000, current month spend=$800
     - Submit request with estimated_cost=$500
     - Engine evaluates → safety_checks.spending_cap_ok=false
     - Expected: decision.decision_type='escalate' (safety rail failed)
     - Expected: decision.safety_checks shows cap violation
   - **Scenario 5: Category exclusion**
     - Create landlord with excluded_categories=['electrical']
     - Submit request: category='electrical'
     - Engine evaluates → confidence=0 (excluded)
     - Expected: decision.decision_type='escalate' (category excluded)
   - **Scenario 6: Landlord confirms decision**
     - Create pending_review decision (from scenario 1)
     - Landlord calls PATCH /api/autonomy/decisions/[id] with review_action='confirmed'
     - Expected: decision.status='confirmed'
     - Expected: decision.reviewed_at set
     - Expected: dispatch proceeds if it was pending_review
   - **Scenario 7: Landlord overrides decision**
     - Create pending_review decision
     - Landlord calls PATCH with review_action='overridden', review_notes='Too expensive'
     - Expected: decision.status='overridden'
     - Expected: if within rollback_window, vendor dispatch is cancelled
     - Expected: feedback recorded
   - **Scenario 8: Autonomy paused**
     - Create landlord with autonomy_settings.paused=true
     - Submit request
     - Expected: decision engine NOT called, request status='awaiting_landlord_review' or manual dispatch
4. Test confidence scoring details:
   - Historical factor: verify score based on past decisions
   - Rules factor: verify category/urgency mappings
   - Cost factor: verify price-based adjustments
   - Vendor factor: verify availability check
   - Category factor: verify exclusion logic
5. Test Claude API integration:
   - Verify prompt sent to Claude
   - Verify reasoning returned in decision.reasoning
   - Verify timeout/failure gracefully escalates
6. Run tests:
   ```bash
   npm test -- integration/autonomy-flow.test.ts
   ```

## Acceptance Criteria
1. [ ] Test file created
2. [ ] Auto-dispatch scenario passes (high confidence)
3. [ ] Escalate scenario passes (low confidence)
4. [ ] Emergency auto-dispatch overrides threshold
5. [ ] Spending cap violation escalates
6. [ ] Category exclusion escalates
7. [ ] Landlord confirm updates status correctly
8. [ ] Landlord override updates status correctly
9. [ ] Paused autonomy skips engine
10. [ ] Confidence factors calculated correctly
11. [ ] Claude API called for reasoning
12. [ ] Claude API timeout/failure gracefully escalates
13. [ ] All decision records created in database
14. [ ] Request status updated appropriately
15. [ ] Monthly stats incremented
16. [ ] All scenarios pass end-to-end
