---
id: 019
title: Build onboarding wizard UI — 3-step single-page wizard
tier: Opus
depends_on: [017, 018]
feature: landlord-onboarding-decision-profile
---

# 019 — Onboarding Wizard UI

## Objective
Build the 3-step onboarding wizard at `/onboarding` using the UI process pipeline.

## Context
Feature plan: `features/inprogress/P1-003-landlord-onboarding-decision-profile/README.md` — see "Onboarding Wizard Steps (3 Steps)" and "Component Hierarchy" sections.
UI process: `docs/ui-process.md`
Design principles: Easiest possible onboarding. Smart defaults. Skip button. Mobile-first. Tappable option cards.

## Implementation

Use the `/ux-design` → `/ui-build` → `/ui-refine` pipeline, or build directly from the plan.

### Files to Create
- `apps/web/app/(landlord)/onboarding/page.tsx` — Page wrapper, checks if profile exists (redirect if complete)
- `apps/web/components/onboarding/onboarding-wizard.tsx` — Main wizard with step state
- `apps/web/components/onboarding/option-card.tsx` — Reusable tappable card (icon + title + description + selected state)

### Layout
- Centered card layout (like auth pages), no sidebar
- Use the `(landlord)` layout but consider hiding sidebar for onboarding
- Progress bar at top (shadcn `Progress`)
- "Skip — use defaults" link always visible

### Step 1: Risk Appetite
- 3 OptionCards: Save Money (PiggyBank), Balanced (Scale, pre-selected + "Recommended" badge), Move Fast (Zap)
- Next button

### Step 2: Delegation Mode
- 2 active OptionCards: I approve everything (ShieldCheck), Auto-approve small jobs (Sparkles, pre-selected + "Recommended" badge)
- 1 disabled OptionCard: Full autopilot (Bot, "Coming soon" badge)
- Conditional slider when "assist" selected: $50–$500, step $25, default $150
- Next button

### Step 3: Confirm & Go
- Summary card showing choices
- "Start Managing" button → PUT /api/settings/profile → redirect /dashboard
- "Go back" link

### Data Flow
- React `useState` for step number, risk_appetite, delegation_mode, max_auto_approve
- On "Start Managing" click: `fetch('/api/settings/profile', { method: 'PUT', body: JSON.stringify({...}) })`
- On success: `router.push('/dashboard')`
- On "Skip": same PUT with defaults (balanced, assist, 150, onboarding_completed: true)

## Acceptance Criteria
1. [x] Verify correct model tier (Opus)
2. [ ] `/onboarding` renders 3-step wizard
3. [ ] Smart defaults pre-selected (balanced, assist, $150)
4. [ ] "Skip — use defaults" saves defaults and redirects to dashboard
5. [ ] Step transitions work with progress bar
6. [ ] Slider shows/hides based on delegation mode
7. [ ] "Full autopilot" disabled with "Coming soon" badge
8. [ ] "Start Managing" saves profile and redirects
9. [ ] Mobile responsive — cards stack, large touch targets
10. [ ] Revisiting `/onboarding` after completion redirects to dashboard
