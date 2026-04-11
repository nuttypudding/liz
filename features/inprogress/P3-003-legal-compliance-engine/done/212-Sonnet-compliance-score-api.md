---
id: 212
title: Compliance score API route — GET /api/compliance/[propertyId]/score
tier: Sonnet
depends_on: [207, 208]
feature: P3-003-legal-compliance-engine
---

# 212 — Compliance Score API Route

## Objective
Build an API endpoint that calculates a compliance score for a property based on completed checklist items vs required items for that property's jurisdiction. Returns a 0-100 score, completion counts, and list of missing items.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

The compliance score is a key metric displayed on the dashboard and property detail pages. It gives landlords at-a-glance visibility into their compliance posture.

## Implementation

1. **GET /api/compliance/[propertyId]/score**
   - Auth: Verify user owns the property
   - Path param: propertyId (uuid)

2. **Logic**:
   - Fetch property's jurisdiction from property_jurisdictions table
   - If no jurisdiction set, return error: 400 "Property jurisdiction not configured"
   - Query jurisdiction_rules for all topics required in that jurisdiction
   - Count total required topics (derived from rules for that state+city combo)
   - Query compliance_checklist_items for this property
   - Count completed items (where completed=true)
   - Calculate score: `(completed_count / total_required_count) * 100`, rounded to nearest integer
   - If no required items, score = 0

3. **Response**:
   ```json
   {
     "property_id": "uuid",
     "score": 75,
     "completed_count": 3,
     "total_required_count": 4,
     "missing_items": [
       {
         "topic": "security_deposit_return_deadline",
         "description": "Return security deposit within 30 days of move-out"
       }
     ],
     "calculated_at": "2026-04-10T14:22:00Z"
   }
   ```

4. **Caching** (optional but recommended):
   - Cache score for 1 hour per property
   - Invalidate on checklist item completion

5. **Error handling**:
   - 404 if property not found
   - 403 if unauthorized
   - 400 if jurisdiction not configured

6. **Update endpoints.md**
   - Document GET /api/compliance/[propertyId]/score under Compliance routes

## Acceptance Criteria
1. [ ] Score calculated as (completed / total) * 100
2. [ ] Handles case when jurisdiction not set (400 error)
3. [ ] Returns completed_count, total_required_count, and missing_items list
4. [ ] missing_items includes topic and human-readable description
5. [ ] Auth enforced (user can only view their own properties)
6. [ ] Response includes calculated_at timestamp
7. [ ] Proper error responses with descriptive messages
8. [ ] endpoints.md updated
