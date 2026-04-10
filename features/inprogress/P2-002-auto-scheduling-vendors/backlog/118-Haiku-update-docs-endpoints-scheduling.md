---
id: 118
title: Update endpoints.md with all new routes and pages
tier: Haiku
depends_on: [116]
feature: P2-002-auto-scheduling-vendors
---

# 118 — Update Endpoints.md With All New Routes and Pages

## Objective
Document all new scheduling API routes and pages in the centralized endpoint registry.

## Context
Reference: `docs/endpoints.md`

This task ensures the endpoint registry stays current with all new routes added by the P2-002-auto-scheduling-vendors feature.

## Implementation
1. Open `docs/endpoints.md`

2. Add section for **Scheduling API Routes** (if not exists):
   - GET /api/vendors/[id]/availability
     - Description: Fetch vendor availability rules
     - Auth: landlord (owner of vendor)
     - Response: VendorAvailabilityRule[]
   - PUT /api/vendors/[id]/availability
     - Description: Update vendor availability rules
     - Auth: landlord (owner of vendor)
     - Body: VendorAvailabilityRule[]
     - Response: VendorAvailabilityRule[]
   - POST /api/scheduling/tenant-availability
     - Description: Submit tenant availability for scheduling task
     - Auth: tenant
     - Body: { taskId, availableSlots }
     - Response: SchedulingTask
   - GET /api/scheduling/suggest/[taskId]
     - Description: Get AI-suggested time slots
     - Auth: landlord
     - Response: { suggestions: [...], noOverlapReason?: string }
   - POST /api/scheduling/confirm
     - Description: Confirm a scheduled appointment
     - Auth: landlord
     - Body: { taskId, selectedDate, selectedTimeStart, selectedTimeEnd }
     - Response: SchedulingTask
   - POST /api/scheduling/reschedule/[taskId]
     - Description: Request appointment reschedule
     - Auth: landlord|tenant|vendor
     - Body: { reason?: string, requestedBy: string }
     - Response: SchedulingTask
   - GET /api/scheduling/tasks/[taskId]
     - Description: Fetch scheduling task details
     - Auth: landlord|tenant|vendor
     - Response: SchedulingTask
   - GET /api/scheduling/tasks
     - Description: Fetch scheduling task for request
     - Auth: landlord|tenant
     - Query: { requestId }
     - Response: SchedulingTask
   - POST /api/scheduling/tasks
     - Description: Create new scheduling task (internal)
     - Auth: internal
     - Body: { request_id, vendor_id, tenant_id }
     - Response: SchedulingTask
   - GET /api/reschedule/verify-token/[token]
     - Description: Validate reschedule token
     - Auth: none (public)
     - Response: { taskId, appointment details }

3. Add section for **Scheduling Pages** (if not exists):
   - /scheduling/availability-prompt/[taskId]
     - Description: Tenant availability submission page
     - Auth: public (token-based)
     - Note: Tenant submits available times for appointment
   - /reschedule/[token]
     - Description: Public vendor reschedule request page
     - Auth: public (token-based)
     - Note: Vendor can request reschedule without login

4. Update **Vendor Management Pages** section (if exists):
   - Add note about Availability tab in vendor edit sheet

5. Ensure all entries include:
   - URL/route path
   - HTTP method (for APIs)
   - Brief description
   - Authentication requirement
   - Input/output types (for APIs)
   - Environment-specific URLs if applicable (local, QA, prod)

## Acceptance Criteria
1. [ ] All 9 API routes documented in endpoints.md
2. [ ] All 2 public pages documented in endpoints.md
3. [ ] All entries include description, auth, and input/output
4. [ ] Formatting consistent with existing entries
5. [ ] All routes correctly use /api prefix
6. [ ] Public pages marked as "public" or "token-based" auth
7. [ ] No typos or formatting errors
