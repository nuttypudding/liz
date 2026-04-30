---
id: 218
title: Compliance alerts API route — GET /api/compliance/alerts/[propertyId]
tier: Sonnet
depends_on: [207, 208, 211]
feature: P3-003-legal-compliance-engine
---

# 218 — Compliance Alerts API Route

## Objective
Build an API endpoint that checks a property's actions and circumstances against jurisdiction rules, returning alerts for potential violations. Examples: rent increase without required notice, tenant entry without proper notice period, missing required disclosures.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Compliance alerts are proactive warnings that help landlords catch mistakes before they happen. The API compares property state and recent actions against jurisdiction rules to identify risks.

## Implementation

1. **GET /api/compliance/alerts/[propertyId]**
   - Auth: Verify user owns the property
   - Path param: propertyId (uuid)
   - Query params (optional):
     - `?severity=warning|error|all` (filter by severity, default "all")
     - `?since=ISO date` (only return alerts for actions/changes since this date)

2. **Alert generation logic**:
   - Fetch property's jurisdiction
   - If jurisdiction not set, return no alerts (or single alert: "Configure jurisdiction")
   - Query jurisdiction_rules for applicable rules
   - Check property state and recent actions against rules:

3. **Alert types** (examples):
   - **Missing security deposit disclosure** — If security_deposit set but no disclosure signed
   - **Rent increase without notice** — If rent increase scheduled soon without notice period buffer
   - **Entry without notice** — If scheduled entry is too soon (less than required notice period)
   - **Habitability defect not addressed** — If maintenance request marked urgent/habitability but not resolved
   - **Missing lease terms** — If lease start/end dates not configured
   - **Incomplete checklist** — If compliance score below 80% (missing checklist items)

4. **Response format**:
   ```json
   {
     "property_id": "uuid",
     "jurisdiction": { "state_code": "CA", "city": "San Francisco" },
     "alert_count": 3,
     "alerts": [
       {
         "id": "uuid",
         "severity": "error",
         "type": "missing_notice_period",
         "title": "Rent increase scheduled without required notice",
         "description": "San Francisco requires 90 days notice before rent increase. Current increase takes effect in 45 days.",
         "affected_item": "property_rent_history | lease_terms | maintenance_request",
         "suggested_action": "Extend effective date to 90 days from now or withdraw increase",
         "jurisdiction_reference": {
           "rule_topic": "notice_period_rent_increase",
           "statute_citation": "SF Admin Code § 37.1",
           "required_days": 90
         },
         "created_at": "2026-04-10T14:22:00Z"
       }
     ]
   }
   ```

5. **Alert severity**:
   - **error** — Violation of law, immediate action needed
   - **warning** — Best practice or upcoming deadline, proactive action recommended

6. **Implementation approach**:
   - Create helper functions to check each alert type
   - Query lease_terms, property details, recent maintenance requests
   - Compare dates against jurisdiction_rules notice periods
   - Deduplicate alerts (don't return same alert twice)

7. **Caching** (optional):
   - Cache alerts for 1 hour per property
   - Invalidate on property changes (rent, lease terms, jurisdiction update)

8. **Update endpoints.md**
   - Document GET /api/compliance/alerts/[propertyId]

## Acceptance Criteria
1. [ ] Fetches property jurisdiction and loads applicable rules
2. [ ] Checks property state for: lease terms, rent changes, upcoming entry, security deposit, habitability issues
3. [ ] Returns alerts with severity, type, title, description, suggested_action
4. [ ] Includes jurisdiction_reference with statute_citation and required_days
5. [ ] Supports filtering by severity
6. [ ] Supports since parameter for recent alerts only
7. [ ] Deduplicates alerts
8. [ ] Auth enforced
9. [ ] Error handling for missing jurisdiction, property not found
10. [ ] endpoints.md updated
