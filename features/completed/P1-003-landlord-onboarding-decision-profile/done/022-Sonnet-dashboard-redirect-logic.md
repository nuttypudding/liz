---
id: 022
title: Dashboard onboarding banner + redirect logic
tier: Sonnet
depends_on: [017]
feature: landlord-onboarding-decision-profile
---

# 022 — Dashboard Onboarding Banner & Redirect Logic

## Objective
Add redirect logic so new landlords are sent to `/onboarding`, and show a "Complete your setup" banner on the dashboard if onboarding is incomplete.

## Context
Feature plan: `features/inprogress/P1-003-landlord-onboarding-decision-profile/README.md` — see "Integration Points > Dashboard" and "Middleware / Redirects".
Dashboard page: `apps/web/app/(landlord)/dashboard/page.tsx`

## Implementation

### Option A: Client-side redirect (simpler for MVP)
1. In the dashboard page component, fetch the profile on mount:
   ```
   GET /api/settings/profile
   ```
2. If 404 (no profile) → `router.push('/onboarding')`
3. If profile exists but `onboarding_completed === false` → show banner

### Banner Component
- Create `apps/web/components/dashboard/onboarding-banner.tsx`
- Simple card with: "Complete your setup to personalize your AI assistant"
- Link to `/onboarding`
- Dismissible (but re-appears until onboarding is done)

### Onboarding Page Guard
- In `apps/web/app/(landlord)/onboarding/page.tsx`:
  - Fetch profile on mount
  - If `onboarding_completed === true` → `router.push('/dashboard')`

## Acceptance Criteria
1. [x] Verify correct model tier (Sonnet)
2. [ ] New landlord (no profile) redirected from dashboard to /onboarding
3. [ ] Incomplete profile shows banner on dashboard
4. [ ] Completed onboarding → visiting /onboarding redirects to dashboard
5. [ ] Banner links to /onboarding
