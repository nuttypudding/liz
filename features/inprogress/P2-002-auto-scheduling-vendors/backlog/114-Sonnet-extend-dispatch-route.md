---
id: 114
title: Extend dispatch route — create scheduling_tasks row + trigger tenant notification
tier: Sonnet
depends_on: [107, 109]
feature: P2-002-auto-scheduling-vendors
---

# 114 — Extend Dispatch Route — Create Scheduling_Tasks Row + Trigger Tenant Notification

## Objective
Integrate the scheduling workflow into the existing vendor dispatch API route by creating a scheduling task and notifying the tenant of the need to provide availability.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Find the existing dispatch API route (e.g., `apps/web/app/api/requests/[id]/dispatch/route.ts` or similar)

2. Modify dispatch route to add scheduling:
   - After successful vendor assignment, create a scheduling_tasks row:
     ```typescript
     const schedulingTask = await supabase
       .from('scheduling_tasks')
       .insert({
         request_id: requestId,
         vendor_id: vendorId,
         tenant_id: tenantId,
         status: 'awaiting_tenant',
         reschedule_count: 0,
       })
       .single();
     ```

3. Trigger tenant availability notification:
   - Call `sendNotification()` with:
     - recipientType: 'tenant'
     - channel: 'email'
     - template: 'availability-prompt'
     - templateData: { taskId, workOrderTitle, propertyAddress, tenantName }
   - Optional: also send SMS if tenant phone available
   - Log notification send (already handled by sendNotification)

4. Update dispatch response:
   - Include schedulingTask in response
   - Set request status appropriately (e.g., 'dispatched_awaiting_schedule')

5. Error handling:
   - If scheduling_tasks creation fails, return 500
   - If notification fails, log error but don't fail dispatch
   - Ensure idempotency: check if scheduling_task already exists before creating

6. Update endpoint documentation in `docs/endpoints.md`

## Acceptance Criteria
1. [ ] Dispatch route creates scheduling_tasks row on vendor assignment
2. [ ] New task has status = 'awaiting_tenant'
3. [ ] reschedule_count initialized to 0
4. [ ] Tenant availability notification sent via sendNotification()
5. [ ] Notification uses 'availability-prompt' template
6. [ ] Email sent to tenant with taskId and work order details
7. [ ] Dispatch response includes scheduling task
8. [ ] Idempotency check prevents duplicate scheduling_tasks
9. [ ] Error handling graceful (notification failure doesn't block dispatch)
