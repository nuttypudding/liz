---
id: 117
title: Unit tests — scheduling API routes, notification service, AI matcher
tier: Haiku
depends_on: [109, 110]
feature: P2-002-auto-scheduling-vendors
---

# 117 — Unit Tests — Scheduling API Routes, Notification Service, AI Matcher

## Objective
Write comprehensive unit tests for the scheduling backend logic, including API routes, notification service, and AI schedule matcher.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create `apps/web/__tests__/api/scheduling.test.ts`:
   - Test POST /api/scheduling/tenant-availability:
     - Valid submission updates task status to awaiting_vendor
     - Invalid taskId returns 404
     - Missing availableSlots returns 400
     - Unauthorized user returns 403
   - Test GET /api/scheduling/suggest/[taskId]:
     - Returns array of suggestions
     - Handles no-overlap case
     - Returns 404 for missing task
   - Test POST /api/scheduling/confirm:
     - Creates confirmed appointment
     - Double-booking detection works (returns 409)
     - Triggers notifications
     - Validates date/time format
   - Test POST /api/scheduling/reschedule/[taskId]:
     - Updates status to 'rescheduling'
     - Increments reschedule_count
     - Triggers landlord notification

2. Create `apps/web/__tests__/lib/notifications.test.ts`:
   - Test sendNotification():
     - Routes to email transport for channel='email'
     - Routes to SMS transport for channel='sms'
     - Routes to in-app transport for channel='in_app'
     - Logs to notification_log table
     - Handles missing env vars gracefully
   - Test email transport:
     - Sends via Resend when API key present
     - Returns messageId on success
     - Gracefully skips when RESEND_API_KEY missing
   - Test SMS transport:
     - Sends via Twilio when credentials present
     - Returns messageId on success
     - Gracefully skips when Twilio credentials missing
   - Test in-app transport:
     - Logs notification to database

3. Create `apps/web/__tests__/lib/ai-matcher.test.ts`:
   - Test suggestSchedulingSlots():
     - Returns array of suggestions
     - Suggestions sorted by score (descending)
     - Max 5 suggestions returned
     - Each suggestion includes date, timeStart, timeEnd, reason, score
     - Handles no-overlap case with explanation
     - Respects vendor availability rules
     - Respects tenant availability constraints
     - Respects urgency level in suggestions
   - Test error handling:
     - Claude API failure returns empty array (not error)
     - Invalid JSON response handled gracefully

4. Use existing test patterns from `apps/web/__tests__/`:
   - Mock Supabase client
   - Mock Claude API
   - Mock Resend/Twilio clients
   - Use describe/test syntax

5. Coverage targets:
   - Happy path for each endpoint/function
   - Error cases (404, 400, 403, 409, 500)
   - Edge cases (no overlap, invalid input, etc.)

## Acceptance Criteria
1. [ ] All scheduling API route tests pass
2. [ ] Notification service tests pass (email, SMS, in-app)
3. [ ] AI matcher tests pass (suggestions, error handling)
4. [ ] Tests cover happy path + error cases
5. [ ] Tests cover edge cases (no overlap, invalid input)
6. [ ] Mocks properly configured (Supabase, Claude, Resend, Twilio)
7. [ ] Test coverage >= 80% for tested modules
8. [ ] `npm test` runs all tests without error
