---
id: 020
title: Build settings page UI — tabbed profile editor
tier: Opus
depends_on: [017, 018]
feature: landlord-onboarding-decision-profile
---

# 020 — Settings Page UI

## Objective
Build the `/settings` page where landlords can view and edit their decision profile after onboarding.

## Context
Feature plan: `features/inprogress/P1-003-landlord-onboarding-decision-profile/README.md` — see "Component Hierarchy > SettingsPage" and "Settings Page" testing checklist.
UI process: `docs/ui-process.md`
Uses same selection components as onboarding wizard (OptionCard, slider).

## Implementation

Use the `/ux-design` → `/ui-build` → `/ui-refine` pipeline, or build directly from the plan.

### Files to Create
- `apps/web/app/(landlord)/settings/page.tsx` — Settings page with tabs
- `apps/web/components/settings/profile-form.tsx` — AI Preferences tab content (reuses OptionCard from onboarding)

### Layout
- Standard landlord layout with sidebar visible
- Page header: "Settings"
- shadcn `Tabs` with two tabs

### Tab 1: AI Preferences
- RiskAppetiteSelector — same 3 OptionCards as onboarding Step 1
- DelegationModeSelector — same cards as onboarding Step 2
- AutoApproveSlider — same conditional slider
- All pre-filled with current profile values from GET /api/settings/profile

### Tab 2: Notifications
- Switch: "Emergency alerts" (notify_emergencies)
- Switch: "All request alerts" (notify_all_requests)

### Data Flow
- On load: `fetch('/api/settings/profile')` → populate form state
- On save: `fetch('/api/settings/profile', { method: 'PUT', body: JSON.stringify({...}) })`
- Save button at bottom, disabled until changes detected
- Toast notification on success

## Acceptance Criteria
1. [x] Verify correct model tier (Opus)
2. [ ] `/settings` renders with two tabs
3. [ ] AI Preferences tab shows current profile values
4. [ ] Can change risk appetite, delegation mode, auto-approve amount
5. [ ] Notifications tab shows toggle switches
6. [ ] Save button sends PUT to API and shows success feedback
7. [ ] Mobile responsive
