---
id: 213
title: Compliance checklist API — mark items complete, fetch status
tier: Sonnet
depends_on: [207, 208]
feature: P3-003-legal-compliance-engine
---

# 213 — Compliance Checklist API Routes

## Objective
Build API endpoints to manage property compliance checklists. Users can fetch checklist items for a property and mark items complete/incomplete. Checklist items are auto-generated from jurisdiction rules.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Checklists help landlords systematically verify compliance with all jurisdiction requirements. Each checklist item corresponds to a topic in the jurisdiction rules.

## Implementation

1. **GET /api/compliance/[propertyId]/checklist**
   - Auth: Verify user owns the property
   - Response: List of all checklist items for property with status
   - Example:
     ```json
     {
       "property_id": "uuid",
       "items": [
         {
           "id": "uuid",
           "topic": "security_deposit_limit",
           "description": "Verify security deposit does not exceed state limit (2 months rent)",
           "completed": false,
           "completed_at": null
         },
         {
           "id": "uuid",
           "topic": "notice_period_entry",
           "description": "Provide 24-hour notice before entering tenant space",
           "completed": true,
           "completed_at": "2026-04-08T10:15:00Z"
         }
       ]
     }
     ```

2. **PATCH /api/compliance/[propertyId]/checklist/[itemId]**
   - Auth: Verify user owns the property
   - Request body: `{ completed: boolean }`
   - Update compliance_checklist_items record
   - Set completed_at to current time if marking complete, null if marking incomplete
   - Log action to compliance_audit_log with action_type: "checklist_item_updated"
   - Response: Updated item
   - Error: 404 if item/property not found, 403 if unauthorized

3. **Auto-generation of checklist items**
   - When property jurisdiction is set (task 211), auto-generate checklist items
   - Query jurisdiction_rules for the property's jurisdiction
   - For each unique topic in rules, create a compliance_checklist_item
   - Set description from jurisdiction rule text
   - Initialize with completed=false

4. **Filtering** (optional):
   - Query param: `?completed=true|false|all` — filter items by completion status
   - Default: return all items

5. **Update endpoints.md**
   - Document GET and PATCH routes under Compliance

## Acceptance Criteria
1. [ ] GET returns all checklist items for property with completion status
2. [ ] PATCH updates completion status and sets/clears completed_at timestamp
3. [ ] Checklist items auto-generated when jurisdiction is set
4. [ ] Each item has topic, description, completed flag, and timestamps
5. [ ] Completion changes logged to compliance_audit_log
6. [ ] Auth enforced for both routes
7. [ ] Optional filtering by completion status works
8. [ ] Proper error responses (400, 403, 404)
9. [ ] endpoints.md updated
