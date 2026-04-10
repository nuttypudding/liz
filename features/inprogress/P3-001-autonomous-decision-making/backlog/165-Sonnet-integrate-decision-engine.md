---
id: 165
title: Integration — wire decision engine into classification/dispatch pipeline
tier: Sonnet
depends_on: [164]
feature: P3-001-autonomous-decision-making
---

# 165 — Integration — Decision Engine Into Dispatch Pipeline

## Objective
Wire the decision engine into the existing classification and vendor dispatch pipeline so that autonomy evaluations happen automatically after request classification.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

The existing flow classifies requests and evaluates dispatch rules. This task inserts autonomy evaluation: after rule evaluation, if delegation_mode is 'autopilot' and autonomy is not paused, call the decision engine. If it recommends dispatch and confidence is high enough, auto-dispatch. Otherwise, escalate for human review.

## Implementation

1. Locate the existing request classification/dispatch pipeline (likely in `/api/requests` or `/api/intake`)
2. After classification and rule evaluation, add autonomy check:
   ```
   if (landlord.delegation_mode === 'autopilot' && !settings.paused) {
     const decision = await evaluateAutonomousDecision(request, settings, landlord);
     // save decision record via POST /api/autonomy/decisions
     if (decision.decision_type === 'dispatch' && decision.confidence_score >= settings.confidence_threshold) {
       // proceed with vendor dispatch (existing logic)
       await dispatchToVendor(request, selectedVendor, ...);
       // update maintenance_requests: autonomous_decision_id, decided_autonomously=true
     } else {
       // escalate: set status to 'awaiting_landlord_review'
       await updateRequestStatus(request.id, 'awaiting_landlord_review');
     }
   }
   ```
3. Update `maintenance_requests` record with:
   - `autonomous_decision_id` (foreign key to the saved decision)
   - `decided_autonomously` (boolean: true if auto-dispatched, false if escalated)
4. Ensure dispatch flow respects autonomy decision:
   - Don't override landlord preferences (vendor exclusions, etc.)
   - Apply decision_type to determine action
5. Add logging for autonomy path (for debugging, e.g., "Auto-dispatched via autonomy engine")
6. Test the integration:
   - Create test request in autopilot delegation mode
   - Verify decision engine is called
   - Verify decision record is created
   - Verify dispatch or escalation follows decision
7. Handle edge cases:
   - Autonomy paused mid-flight: escalate
   - Settings change during processing: re-evaluate
   - Claude API timeout: escalate with warning

## Acceptance Criteria
1. [ ] Decision engine is called after classification
2. [ ] Only called when delegation_mode='autopilot'
3. [ ] Only called when autonomy settings.paused=false
4. [ ] Decision record is created via POST /api/autonomy/decisions
5. [ ] Decision type (dispatch vs escalate) determines action
6. [ ] Confidence threshold is respected
7. [ ] maintenance_requests.autonomous_decision_id is set
8. [ ] maintenance_requests.decided_autonomously is set correctly
9. [ ] Logging includes autonomy path decision
10. [ ] Edge cases (pause, timeout) default to escalate
11. [ ] Integration tested end-to-end with real request
