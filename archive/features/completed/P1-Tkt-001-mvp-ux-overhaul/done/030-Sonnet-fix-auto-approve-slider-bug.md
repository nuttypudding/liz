---
id: 030
title: Fix auto-approve slider bug (T-011) in onboarding and settings
tier: Sonnet
depends_on: []
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 030 — Fix Auto-Approve Slider Bug

## Objective

Fix the auto-approve threshold slider that renders but does not respond to drag/click interaction in both the onboarding wizard and settings page.

## Context

Bug T-011 reported by product owner (Liz). The slider appears inside the conditional `{delegationMode === "assist" && (...)}` block. See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — "Slider Bug Fix (Change 3)" section.

Key files:
- `apps/web/components/onboarding/onboarding-wizard.tsx` — Step 1 slider
- `apps/web/app/(landlord)/settings/page.tsx` — Settings page slider
- `apps/web/components/ui/slider.tsx` — shadcn Slider component

## Implementation

1. **Root cause analysis**: Investigate the slider inside the `<div className="rounded-lg border bg-muted/30 p-4 space-y-3">` block:
   - Check if a parent `<button>` or clickable element is swallowing pointer events
   - Check for `pointer-events: none` inherited from parent CSS
   - Check z-index stacking with the `OptionCard` wrapper
   - Check if the shadcn Slider (Radix Slider) version has known issues
   - Test the slider in isolation to confirm it works outside the wizard context

2. **Fix**: Apply the fix to both locations (onboarding wizard and settings page)

3. **Verify**: Slider responds to drag, click-on-track, and value updates in real-time

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Root cause identified and documented
3. [ ] Slider responds to drag interaction in onboarding wizard
4. [ ] Slider responds to click-on-track in onboarding wizard
5. [ ] Slider value updates the displayed dollar amount in real time
6. [ ] Same fix applied to settings page slider
7. [ ] Settings page slider works correctly
8. [ ] Selecting "I approve everything" still hides the slider
9. [ ] Selecting "Auto-approve small jobs" still shows the slider
