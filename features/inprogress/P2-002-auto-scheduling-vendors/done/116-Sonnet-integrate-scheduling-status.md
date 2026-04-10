---
id: 116
title: Integrate scheduling status into request detail pages (landlord + tenant)
tier: Sonnet
depends_on: [111, 112, 113]
feature: P2-002-auto-scheduling-vendors
---

# 116 — Integrate Scheduling Status Into Request Detail Pages (Landlord + Tenant)

## Objective
Display scheduling information and status on existing request detail pages for both landlord and tenant views, with appropriate UI for different scheduling states.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Find existing request detail page for landlord view (e.g., `apps/web/app/requests/[id]/page.tsx`)
2. Find existing request detail page for tenant view (e.g., `apps/web/app/tenant/requests/[id]/page.tsx`)

3. **Landlord View Integration**:
   - Fetch scheduling_task for request_id
   - If scheduling_task exists:
     - Show ScheduleConfirmationCard component (task 113) when status = 'confirmed'
     - Show "Scheduling Status" badge before card:
       - "Awaiting Tenant Response" (status = awaiting_tenant)
       - "Awaiting Vendor Response" (status = awaiting_vendor)
       - "Confirmed" (status = confirmed)
       - "Rescheduling Requested" (status = rescheduling)
     - Show "Schedule Now" button when status = pending or awaiting_tenant or awaiting_vendor
     - On "Schedule Now", open SchedulingModal (task 111)
   - If no scheduling_task exists (dispatched but scheduling not started):
     - Show "Schedule Now" button
     - Message: "Click to schedule vendor and notify tenant"

4. **Tenant View Integration**:
   - Fetch scheduling_task for request_id
   - If scheduling_task exists:
     - Show ScheduleConfirmationCard component when status = 'confirmed'
     - If status = awaiting_tenant:
       - Show prompt message: "Please confirm your availability for this repair"
       - "Submit Availability" button linking to /scheduling/availability-prompt/[taskId]
     - If status = awaiting_vendor:
       - Show status message: "Waiting for vendor to confirm their availability"
     - If status = rescheduling:
       - Show message: "Reschedule request pending landlord review"

5. **UI Placement**:
   - Add scheduling section above or below existing details
   - Use consistent Card component styling
   - Clear section header: "Appointment Details" or "Scheduling Information"

6. **Responsive Design**:
   - Full width on mobile
   - Appropriate spacing on desktop

## Acceptance Criteria
1. [ ] Landlord view shows scheduling status badge
2. [ ] "Schedule Now" button appears when appropriate
3. [ ] SchedulingModal opens on "Schedule Now" click
4. [ ] ScheduleConfirmationCard renders when status = 'confirmed'
5. [ ] Tenant view shows availability prompt when status = awaiting_tenant
6. [ ] "Submit Availability" button links to correct page
7. [ ] Tenant view shows status messages for awaiting_vendor and rescheduling
8. [ ] Scheduling section responsive on mobile
9. [ ] Works for both landlord and tenant views
