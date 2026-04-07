---
id: 017
title: Profile API routes — GET and PUT /api/settings/profile
tier: Sonnet
depends_on: [016]
feature: landlord-onboarding-decision-profile
---

# 017 — Profile API Routes

## Objective
Create GET and PUT API routes for the landlord decision profile.

## Context
Feature plan: `features/inprogress/P1-003-landlord-onboarding-decision-profile/README.md`
Existing API pattern: `apps/web/app/api/properties/route.ts` — uses `auth()` from Clerk, `createServerSupabaseClient()`, Zod validation.

## Implementation

1. Create `apps/web/app/api/settings/profile/route.ts` with:

   **GET**: Fetch profile for current Clerk user. Return 404 if not found (signals onboarding needed).
   ```
   auth() → userId → supabase.from('landlord_profiles').select('*').eq('landlord_id', userId).single()
   ```

   **PUT**: Create or upsert profile. Validate with Zod schema:
   - `risk_appetite`: enum('cost_first', 'speed_first', 'balanced')
   - `delegation_mode`: enum('manual', 'assist', 'auto')
   - `max_auto_approve`: number, min 0, max 10000
   - `notify_emergencies`: boolean
   - `notify_all_requests`: boolean
   - `onboarding_completed`: boolean

   Use Supabase `upsert` with `onConflict: 'landlord_id'`.

2. Add Zod schema to `apps/web/lib/validations.ts`.

## Acceptance Criteria
1. [x] Verify correct model tier (Sonnet)
2. [ ] GET returns profile or 404
3. [ ] PUT creates new profile (first time) or updates existing
4. [ ] Zod validation rejects invalid values
5. [ ] Unauthorized requests return 401
