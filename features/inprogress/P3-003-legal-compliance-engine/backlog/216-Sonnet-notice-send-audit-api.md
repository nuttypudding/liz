---
id: 216
title: Notice send + audit log API route — POST /api/compliance/notices/[id]/send + GET audit
tier: Sonnet
depends_on: [207, 215]
feature: P3-003-legal-compliance-engine
---

# 216 — Notice Send and Audit Log API Routes

## Objective
Build API endpoints to send generated notices and retrieve the compliance audit trail for a property. Sending a notice updates its status, logs delivery, and creates an audit record.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Once a notice is generated and reviewed, landlords need to send it. The system tracks all compliance actions in an audit log for recordkeeping and evidence of compliance efforts.

## Implementation

1. **POST /api/compliance/notices/[id]/send**
   - Auth: Verify user owns the property
   - Path param: id (notice uuid)
   - Request body (optional):
     ```json
     {
       "delivery_method": "email|print|other" (optional, defaults to "email"),
       "notes": "string (optional delivery notes)"
     }
     ```

2. **Send logic**:
   - Fetch notice from compliance_notices table
   - Verify ownership (compare landlord_id to auth user)
   - Update notice:
     - Set status to "sent"
     - Set sent_at to current timestamp
   - Log to compliance_audit_log:
     - action_type: "notice_sent"
     - details: `{ notice_id, notice_type, delivery_method, tenant_name }`
   - If delivery_method is "email", queue for email delivery (or mark for manual send)
   - Response: Updated notice record

3. **Response**:
   ```json
   {
     "id": "uuid",
     "property_id": "uuid",
     "notice_type": "entry",
     "status": "sent",
     "content": "...",
     "sent_at": "2026-04-10T14:22:00Z",
     "delivery_method": "email"
   }
   ```

4. **Error handling**:
   - 404 if notice not found
   - 403 if unauthorized
   - 400 if notice status is not "generated" (can't resend sent notices without explicit override)

5. **GET /api/compliance/[propertyId]/audit-log**
   - Auth: Verify user owns the property
   - Query params (optional):
     - `?action_type=notice_sent|checklist_item_updated|jurisdiction_updated|etc` (filter by action)
     - `?limit=20` (default 20, max 100)
     - `?offset=0` (pagination)
     - `?start_date=ISO date` and `?end_date=ISO date` (date range filter)

6. **Audit log response**:
   ```json
   {
     "property_id": "uuid",
     "total_count": 42,
     "limit": 20,
     "offset": 0,
     "entries": [
       {
         "id": "uuid",
         "action_type": "notice_sent",
         "details": { "notice_type": "entry", "delivery_method": "email" },
         "timestamp": "2026-04-10T14:22:00Z",
         "actor_id": "uuid"
       },
       {
         "id": "uuid",
         "action_type": "checklist_item_updated",
         "details": { "topic": "security_deposit_limit", "completed": true },
         "timestamp": "2026-04-09T10:15:00Z",
         "actor_id": "uuid"
       }
     ]
   }
   ```

7. **Update endpoints.md**
   - Document POST /api/compliance/notices/[id]/send
   - Document GET /api/compliance/[propertyId]/audit-log

## Acceptance Criteria
1. [ ] POST /send updates notice status to "sent" and sets sent_at
2. [ ] Sending logged to compliance_audit_log with action_type: "notice_sent"
3. [ ] GET /audit-log returns paginated list of compliance actions
4. [ ] Audit log supports filtering by action_type and date range
5. [ ] Audit log responses include action_type, details, timestamp, actor_id
6. [ ] Send endpoint prevents resending already-sent notices
7. [ ] Auth enforced on both routes
8. [ ] Proper error responses (400, 403, 404)
9. [ ] endpoints.md updated with both routes
