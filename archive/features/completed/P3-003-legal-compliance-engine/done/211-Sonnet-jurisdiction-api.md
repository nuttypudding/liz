---
id: 211
title: Jurisdiction API routes — GET/POST /api/properties/[id]/jurisdiction
tier: Sonnet
depends_on: [207]
feature: P3-003-legal-compliance-engine
---

# 211 — Jurisdiction API Routes

## Objective
Build API endpoints to manage property jurisdictions. Users can retrieve and update the state/city jurisdiction for each property. API supports auto-detection from property address if available.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Every property must have an assigned jurisdiction (state + city) so the compliance engine can load the correct rules and requirements for that location.

## Implementation

1. **GET /api/properties/[id]/jurisdiction**
   - Auth: Verify user owns the property
   - Response: `{ property_id, state_code, city, created_at, updated_at }`
   - If no jurisdiction set, return `{ property_id, state_code: null, city: null }`
   - Error: 404 if property not found, 403 if unauthorized

2. **POST /api/properties/[id]/jurisdiction**
   - Auth: Verify user owns the property
   - Request body: `{ state_code: string, city?: string }`
   - Validate state_code is valid 2-letter code (CA, NY, TX, etc.)
   - Validate city against jurisdiction_rules table if provided (must exist in rules)
   - Upsert into property_jurisdictions table
   - Response: `{ property_id, state_code, city, created_at, updated_at }`
   - Error: 400 if validation fails, 404 if property not found

3. **Optional: Auto-detect from address**
   - If property has an `address` field, extract state from address
   - Attempt to match city from address to known cities in jurisdiction_rules
   - Return as suggestion: `{ suggested_state_code, suggested_city }`
   - User can accept or override

4. **Audit logging**
   - Log jurisdiction changes to compliance_audit_log
   - action_type: "jurisdiction_updated"
   - details: `{ old_jurisdiction, new_jurisdiction }`

5. **Update endpoints.md**
   - Document both GET and POST routes under "API Routes / Compliance"

## Acceptance Criteria
1. [ ] GET route returns current jurisdiction or null if not set
2. [ ] POST route validates state_code and city
3. [ ] POST route upserts into property_jurisdictions (creates if new, updates if exists)
4. [ ] Both routes verify user authorization
5. [ ] Jurisdiction changes are logged to compliance_audit_log
6. [ ] Auto-detect suggestion optional feature implemented
7. [ ] Proper error responses (400, 403, 404) with descriptive messages
8. [ ] endpoints.md updated with route documentation
