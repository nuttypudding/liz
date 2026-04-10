---
id: 109
title: Scheduling API — tenant-availability, suggest, confirm, reschedule routes
tier: Sonnet
depends_on: [102, 104, 107]
feature: P2-002-auto-scheduling-vendors
---

# 109 — Scheduling API — Tenant-Availability, Suggest, Confirm, Reschedule Routes

## Objective
Create the core API routes that implement the scheduling workflow: tenant availability submission, AI-suggested slot generation, confirmation, and rescheduling.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create `apps/web/app/api/scheduling/tenant-availability/route.ts`:
   - POST /api/scheduling/tenant-availability
   - Accept: taskId, availableSlots (array of day-part selections: morning/afternoon/evening for dates)
   - Update scheduling_tasks row: status = 'awaiting_vendor'
   - Return updated SchedulingTask
   - Validate taskId exists and status is 'awaiting_tenant'

2. Create `apps/web/app/api/scheduling/suggest/[taskId]/route.ts`:
   - GET /api/scheduling/suggest/[taskId]
   - Fetch scheduling_task, vendor availability, tenant availability
   - Call AI matcher (see task 110) to get suggested slots
   - Return array of suggested slots with reasoning
   - Update task status to 'awaiting_vendor' if needed

3. Create `apps/web/app/api/scheduling/confirm/route.ts`:
   - POST /api/scheduling/confirm
   - Accept: taskId, selectedDate, selectedTimeStart, selectedTimeEnd
   - Validate no double-booking (vendor, tenant, property)
   - Update scheduling_tasks: status = 'confirmed', scheduled_date, scheduled_time_start, scheduled_time_end
   - Trigger notifications: send schedule-confirmed email to vendor, tenant, landlord
   - Return updated SchedulingTask
   - Return 409 if double-booking detected

4. Create `apps/web/app/api/scheduling/reschedule/[taskId]/route.ts`:
   - POST /api/scheduling/reschedule/[taskId]
   - Accept: reason (optional string), requestedBy (vendor|tenant|landlord)
   - Update scheduling_tasks: status = 'rescheduling', reschedule_count += 1
   - Trigger notification to landlord: reschedule-request email
   - Return updated SchedulingTask

5. CRUD for scheduling_tasks:
   - GET /api/scheduling/tasks/[taskId] - fetch single task
   - GET /api/scheduling/tasks?requestId=X - fetch task for a request
   - POST /api/scheduling/tasks - create new task (called from dispatch route)

6. All endpoints:
   - Authenticate with withAuth() middleware (role varies by endpoint)
   - Validate with Zod schemas
   - Handle edge cases (missing task, invalid status transition, etc.)

## Acceptance Criteria
1. [ ] POST /api/scheduling/tenant-availability updates task status
2. [ ] GET /api/scheduling/suggest/[taskId] returns ranked suggestions
3. [ ] POST /api/scheduling/confirm creates confirmed appointment
4. [ ] Double-booking detection prevents conflicts
5. [ ] POST /api/scheduling/reschedule/[taskId] updates reschedule_count
6. [ ] All status transitions validated (e.g., can't confirm from 'pending')
7. [ ] CRUD operations work for scheduling_tasks
8. [ ] All endpoints use proper authentication
