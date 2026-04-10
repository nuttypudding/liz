---
id: 115
title: Public reschedule page — token-based vendor reschedule endpoint + minimal UI
tier: Sonnet
depends_on: [109]
feature: P2-002-auto-scheduling-vendors
---

# 115 — Public Reschedule Page — Token-Based Vendor Reschedule Endpoint + Minimal UI

## Objective
Create a public-facing page where vendors can request appointment rescheduling via a secure token-based link sent in an email, without requiring login.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create token generation utility `apps/web/lib/scheduling/reschedule-tokens.ts`:
   - Export `generateRescheduleToken(taskId: string): { token: string; expiresAt: Date }`
   - Use crypto.randomUUID() or similar for secure token generation
   - Store token in database (e.g., reschedule_tokens table) with taskId, token, expiresAt
   - Token expires after 72 hours
   - Include token in reschedule-request email as query param: `/reschedule/[token]`

2. Create API route `apps/web/app/api/reschedule/verify-token/[token]/route.ts`:
   - GET /api/reschedule/verify-token/[token]
   - Validate token:
     - Check token exists in reschedule_tokens table
     - Check expiration (current time < expiresAt)
   - If valid, return taskId and appointment details (read-only)
   - If invalid/expired, return 401 with error message

3. Create page `apps/web/app/reschedule/[token]/page.tsx`:
   - Public page (no authentication required)
   - URL pattern: /reschedule/[token]
   - On mount, call verify-token API to validate and fetch appointment details
   - If token invalid/expired:
     - Show "This link has expired" message
     - Suggest vendor contact landlord
   - If valid, display:
     - Appointment summary (read-only): current date, time, address, work order
     - "Request Reschedule" form with:
       - Optional reason textarea (max 300 chars)
       - Suggested reasons: "Scheduling conflict", "Emergency repair needed", "Equipment unavailable", "Other"
       - Submit button: "Send Reschedule Request"
   - On submit, POST to /api/scheduling/reschedule/[taskId] with reason
   - Show loading state
   - On success: "Your reschedule request has been sent to the landlord"
   - On error: show error message

4. **Mobile-Friendly Design**:
   - Responsive form
   - Touch-friendly buttons
   - Clear typography

5. **Security Considerations**:
   - CSRF token required for form submission
   - Rate limit reschedule requests per token (e.g., 5 per 24 hours)
   - Log all reschedule requests for audit

## Acceptance Criteria
1. [ ] generateRescheduleToken() creates secure token with 72-hour expiry
2. [ ] Token stored in database and can be validated
3. [ ] verify-token API validates token and returns appointment details
4. [ ] Expired tokens rejected with 401
5. [ ] Reschedule page loads with appointment summary
6. [ ] Form textarea enforces 300 char limit
7. [ ] Submit sends reschedule request to API
8. [ ] Success message shown after submission
9. [ ] Error message shown on API failure
10. [ ] Mobile-responsive design
11. [ ] CSRF protection implemented
