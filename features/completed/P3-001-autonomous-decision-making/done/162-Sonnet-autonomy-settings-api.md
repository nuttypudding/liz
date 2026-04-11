---
id: 162
title: Autonomy settings API — CRUD routes for /api/autonomy/settings
tier: Sonnet
depends_on: [158, 161]
feature: P3-001-autonomous-decision-making
---

# 162 — Autonomy Settings API Routes

## Objective
Build API routes for autonomy settings CRUD operations: GET current settings, PUT to update, with validation and default initialization.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

The settings API is the control plane for autonomy. Landlords configure their confidence thresholds, spending caps, category exclusions, vendor preferences, and emergency handling via these routes.

## Implementation

1. Create route file: `apps/web/app/api/autonomy/settings/route.ts`
2. Implement GET handler:
   - Authenticate with withAuth middleware
   - Fetch settings for the landlord
   - If no settings exist, create defaults (confidence_threshold=0.85, per_decision_cap=500, monthly_cap=5000, empty exclusions, paused=true)
   - Return AutonomySettings type
3. Implement PUT handler:
   - Authenticate with withAuth middleware
   - Accept partial update body (optional fields)
   - Validate all numeric fields: 0 <= confidence_threshold <= 1, per_decision_cap > 0, monthly_cap > 0, rollback_window_hours >= 0
   - Validate arrays: excluded_categories is array of valid category names
   - Update record and return updated settings
4. Error handling:
   - 401 if unauthenticated
   - 400 if validation fails (include field-level errors)
   - 500 on database error
5. Add rate limiting if needed (optional)
6. Test with curl/Postman before moving to component integration

## Acceptance Criteria
1. [ ] Route file created at correct path
2. [ ] GET returns defaults on first access
3. [ ] GET validates landlord_id from auth context
4. [ ] PUT validates confidence_threshold (0-1)
5. [ ] PUT validates spending caps (positive numbers)
6. [ ] PUT validates category array
7. [ ] PUT returns updated settings
8. [ ] Error responses include field-level error details
9. [ ] RLS policies enforced (no SQL injection risk)
10. [ ] Routes tested with manual API calls
