---
id: 175
title: Notification integration — notify on emergency auto-dispatch, respect preferences
tier: Sonnet
depends_on: [165]
feature: P3-001-autonomous-decision-making
---

# 175 — Notification Integration for Autonomy

## Objective
Integrate notifications into the autonomy flow: alert landlords when emergencies are auto-dispatched, and respect existing notification preferences.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

When the AI auto-dispatches an emergency request, the landlord must be notified immediately (SMS/email/in-app). Regular auto-dispatches don't require notifications (to avoid spam), but landlords can opt-in if desired.

## Implementation

1. Locate existing notification system:
   - Check `apps/web/lib/notifications/...` or similar
   - Identify notification preference fields in users table (notify_emergencies, notify_all_requests, etc.)
2. In the dispatch integration (task #165), after decision engine returns:
   - If decision_type='dispatch' and urgency='emergency':
     - Fetch landlord notification preferences
     - If notify_emergencies=true OR notify_all_requests=true:
       - Send notification (SMS/email/in-app):
         - Title: "Emergency request auto-dispatched"
         - Body: "[Tenant] [Building] - [Issue]. Vendor notified: [Vendor]"
         - Link: `/requests/[request_id]` for details
       - Notification type: 'emergency_auto_dispatch'
3. For non-emergency auto-dispatches:
   - If notify_all_requests=true:
     - Send optional notification
     - Less urgent tone: "[Request type] auto-dispatched to [Vendor]"
4. Notification delivery:
   - Use existing notification service (likely Twilio for SMS, Sendgrid for email, or Firebase for in-app)
   - Async/queue-based if possible (don't block dispatch)
   - Retry on failure (don't escalate or cancel dispatch if notification fails)
5. Error handling:
   - Log notification failures
   - Show warning to landlord if notification failed but dispatch succeeded
   - Don't escalate decision due to notification error
6. Testing:
   - Create emergency request in autopilot mode
   - Verify landlord receives notification (check SMS, email, in-app)
   - Create regular request in autopilot mode
   - Verify no notification sent (unless notify_all_requests=true)
   - Override notification preference and test again

## Acceptance Criteria
1. [ ] Notification sent on emergency auto-dispatch
2. [ ] Respects notify_emergencies preference
3. [ ] Respects notify_all_requests preference
4. [ ] Non-emergency dispatches optional (based on preference)
5. [ ] Notification contains tenant, building, issue, vendor
6. [ ] Notification includes link to request detail
7. [ ] Notification async (doesn't block dispatch)
8. [ ] Notification failures logged but don't escalate decision
9. [ ] SMS/Email/In-app delivery works
10. [ ] Retries on transient failure
