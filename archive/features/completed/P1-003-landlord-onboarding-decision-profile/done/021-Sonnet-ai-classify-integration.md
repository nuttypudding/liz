---
id: 021
title: Inject decision profile into AI classify route
tier: Sonnet
depends_on: [017]
feature: landlord-onboarding-decision-profile
---

# 021 — AI Classify Integration

## Objective
Update `/api/classify` to read the landlord's decision profile and inject it into the Claude prompt, so AI triage respects the landlord's risk appetite.

## Context
Feature plan: `features/inprogress/P1-003-landlord-onboarding-decision-profile/README.md` — see "Integration Points > AI Classification".
Existing classify route: `apps/web/app/api/classify/route.ts`

## Implementation

1. In the classify route, after authenticating the user:
   - Fetch the landlord's profile: `supabase.from('landlord_profiles').select('*').eq('landlord_id', userId).single()`
   - If no profile exists, use defaults (balanced, assist, 150)

2. Append profile context to the Claude prompt:
   ```
   Landlord preferences: This landlord prioritizes {risk_appetite}.
   - cost_first: Minimize repair costs. Rate urgency conservatively. Recommend affordable options.
   - speed_first: Minimize resolution time. Rate urgency higher for borderline cases. Recommend fastest vendors.
   - balanced: Weigh both cost and speed equally.
   Consider this when rating urgency and recommending actions.
   ```

3. No changes to the response schema — just the prompt context.

## Acceptance Criteria
1. [x] Verify correct model tier (Sonnet)
2. [ ] Classify route reads landlord profile from DB
3. [ ] Profile context appended to Claude prompt
4. [ ] Falls back to defaults if no profile exists
5. [ ] Different risk appetites produce different urgency/recommendation nuances
