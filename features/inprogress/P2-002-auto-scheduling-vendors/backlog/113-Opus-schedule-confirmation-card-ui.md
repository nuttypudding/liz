---
id: 113
title: Schedule confirmation card + reschedule dialog UI
tier: Opus
depends_on: [103, 109]
feature: P2-002-auto-scheduling-vendors
---

# 113 — Schedule Confirmation Card + Reschedule Dialog UI

## Objective
Build the confirmation card displayed on request detail pages (landlord and tenant view) showing scheduled appointment details, and the reschedule request dialog.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create `apps/web/components/scheduling/ScheduleConfirmationCard.tsx`:
   - Component displays confirmed appointment details
   - Show only when scheduling_task exists and status = 'confirmed'
   - Content:
     - Header: "Scheduled Appointment" or "Your Appointment"
     - Date: formatted as "Thursday, April 12, 2026"
     - Time: "2:00 PM - 3:00 PM EST"
     - Vendor info (for tenant view): name, phone, company name
     - Address: property address
     - Work order summary: category, description
     - Status badge: "Confirmed", "Pending Tenant Response", "Rescheduling Requested"
   - Visual: use Card component, with icon for calendar/clock
   - Color scheme: blue/green for confirmed, yellow for pending, orange for rescheduling

2. **Countdown Timer** (for future use):
   - Show days/hours until appointment
   - Update every minute
   - Change color if < 24 hours remaining

3. Create `apps/web/components/scheduling/RescheduleDialog.tsx`:
   - Dialog component triggered by "Request Reschedule" button
   - Content:
     - "Need to reschedule?"
     - Current appointment display (read-only)
     - Optional reason textarea (max 200 chars)
     - Reason placeholder: "Emergency repair needed", "Scheduling conflict", etc.
     - Who is requesting (radio: landlord/vendor/tenant) - auto-filled
     - Cancel and "Submit Request" buttons
   - On submit, POST to /api/scheduling/reschedule/[taskId]
   - Show loading state
   - On success: "Reschedule request submitted. Landlord will review shortly."
   - On error: show error message

4. **Integration Points**:
   - Add "Request Reschedule" button to ScheduleConfirmationCard
   - Show card on request detail pages (landlord + tenant)
   - Use existing request detail page structures

5. **Mobile Design**:
   - Card responsive (full-width on mobile)
   - Dialog responsive (full-screen modal on mobile)

## Acceptance Criteria
1. [ ] ScheduleConfirmationCard renders when scheduling_task.status = 'confirmed'
2. [ ] Card displays date, time, vendor info, address, work order summary
3. [ ] Status badge updates based on scheduling_task.status
4. [ ] Countdown timer updates and shows days/hours until appointment
5. [ ] RescheduleDialog opens when button clicked
6. [ ] Reason textarea optional but enforces 200 char limit
7. [ ] Submit calls POST /api/scheduling/reschedule/[taskId]
8. [ ] Success message shown after reschedule submitted
9. [ ] Error message shown on API failure
10. [ ] Mobile-responsive for both card and dialog
