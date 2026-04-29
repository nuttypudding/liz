---
id: 174
title: Override + rollback logic — dialog, feedback recording, cooldown enforcement
tier: Sonnet
depends_on: [163, 165]
feature: P3-001-autonomous-decision-making
---

# 174 — Override & Rollback Logic

## Objective
Implement full override workflow: dialog capture, rollback (vendor cancellation), feedback recording, and temporary cooldown on similar decisions.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

When a landlord overrides an autonomous decision, the system should:
1. Cancel the dispatch if within rollback window
2. Record the override and reason
3. Use the feedback to temporarily disable similar autonomous decisions (cooldown)

## Implementation

1. Override dialog (already partially in #170):
   - Modal with free-text "Reason for override" field
   - Buttons: Cancel, Submit
   - Show loading spinner on Submit
2. On override submission, call PATCH /api/autonomy/decisions/[id]:
   - Body: { review_action: 'overridden', review_notes: reason_text }
   - If successful, proceed to rollback logic
3. Implement rollback logic (in API route or helper function):
   - Check autonomous_decision.created_at vs current time
   - If (now - created_at) < settings.rollback_window_hours:
     - If dispatch was sent to vendor:
       - Call vendor cancellation API (existing vendor integration)
       - Update request status to 'cancelled' or 'pending_landlord_action'
       - Notify vendor: "Dispatch cancelled by landlord"
     - Log: "Decision overridden within rollback window — dispatch cancelled"
   - If (now - created_at) >= rollback_window_hours:
     - Log: "Decision overridden, but outside rollback window — no vendor cancellation"
4. Record feedback (for AI learning):
   - Create new table `autonomy_feedback` (if not exists):
     - decision_id, landlord_id, feedback_type ('override'), reason_text, created_at
   - Insert feedback record
5. Implement cooldown logic:
   - On override, identify similar decisions:
     - Same category + urgency from the same tenant or building
     - Created within last 7 days
   - Temporarily disable autonomy for similar requests:
     - Option A: Set cooldown flag in autonomy_settings (cooldown_until_date)
     - Option B: Create cooldown rule in autonomous_decisions logic (if category=X and tenant_id=Y, escalate for N hours)
   - Duration: 24 hours (after override, don't auto-dispatch similar requests for 24h)
6. Wire into /api/autonomy/decisions/[id] PATCH handler:
   - After updating decision status to 'overridden':
     - Call rollback logic (cancel vendor dispatch if in window)
     - Call feedback recording (insert into autonomy_feedback)
     - Call cooldown enforcement (set cooldown or flag)
7. Notify landlord on success:
   - Toast: "Decision overridden. Vendor dispatch cancelled." (if within window)
   - Toast: "Decision overridden." (if outside window)
8. Error handling:
   - If vendor cancellation fails: show warning but don't block override
   - If feedback recording fails: log error but don't block override
9. Testing:
   - Override a decision within rollback window and verify vendor receives cancellation
   - Override a decision outside rollback window and verify no vendor call
   - Create new similar decision within cooldown period and verify it escalates instead of dispatching

## Acceptance Criteria
1. [ ] Override dialog captures reason text
2. [ ] PATCH /api/autonomy/decisions/[id] updates status to 'overridden'
3. [ ] Rollback checks window (created_at vs now)
4. [ ] Within window: vendor dispatch is cancelled
5. [ ] Outside window: no vendor cancellation attempted
6. [ ] Feedback recorded in autonomy_feedback table
7. [ ] Cooldown activated after override (24 hour period)
8. [ ] Similar decisions escalate during cooldown (not auto-dispatched)
9. [ ] Success toast shown to landlord
10. [ ] Vendor cancellation errors don't block override
11. [ ] Feedback recording errors don't block override
12. [ ] Cooldown expires after 24 hours
