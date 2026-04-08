---
id: 040
title: Update settings page — slider fix + terminology consistency
tier: Sonnet
depends_on: [30]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 040 — Settings Page: Slider Fix + Terminology

## Objective

Apply the slider bug fix (from task 030) to the settings page and update any user-facing "AI" text to "Agent" where appropriate.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — "Settings Page Changes" section.

File: `apps/web/app/(landlord)/settings/page.tsx`

## Implementation

1. Apply the same slider fix from task 030 to the settings page
2. Update terminology: any user-facing "AI" in card text → "Agent" (keep "AI Preferences" tab label as section name)
3. Add the autopilot note under the disabled "Full autopilot" card (same as onboarding)

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Slider works in settings page (drag + click)
3. [ ] Terminology updated where applicable
4. [ ] Autopilot note present under disabled card
5. [ ] "AI Preferences" tab label unchanged (section name is fine)
