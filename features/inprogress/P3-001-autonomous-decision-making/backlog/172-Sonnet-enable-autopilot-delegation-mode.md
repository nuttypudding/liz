---
id: 172
title: Enable "Full autopilot" delegation mode — remove "Coming soon" disabled state
tier: Sonnet
depends_on: [169]
feature: P3-001-autonomous-decision-making
---

# 172 — Enable Full Autopilot Delegation Mode

## Objective
Remove the "Coming soon" badge and disabled state from the "Full autopilot" delegation mode option, enabling it as a selectable mode for landlords.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

The onboarding flow and settings page likely have a delegation mode selector with options: manual, assisted, and full autopilot. "Full autopilot" was disabled with a "Coming soon" badge. Now that autonomy is implemented, enable this mode.

## Implementation

1. Locate delegation mode selector:
   - Likely in onboarding flow (`apps/web/app/(landing)/onboarding/...`)
   - Likely in settings (`apps/web/app/(landlord)/settings/...`)
   - Search for "Coming soon" or "Full autopilot" in the codebase
2. Remove the "Coming soon" badge from full autopilot option
3. Remove `disabled` or `isDisabled` prop from full autopilot button/radio
4. Enable selection of full autopilot mode:
   - If previously disabled, ensure click handler now works
   - If onboarding: allow progression to next step after selecting autopilot
   - If settings: allow saving delegation_mode='autopilot'
5. Add helpful tooltip/description for full autopilot:
   - "AI makes routine decisions autonomously. Review decisions and set confidence thresholds in Autopilot settings."
6. Verify delegation mode is saved to database correctly
7. Test flow:
   - Select full autopilot in onboarding
   - Verify it saves to user profile
   - Verify settings can view/edit full autopilot mode
   - Verify autonomy engine is called when delegation_mode='autopilot'

## Acceptance Criteria
1. [ ] "Coming soon" badge removed from full autopilot option
2. [ ] Full autopilot option is no longer disabled
3. [ ] Full autopilot option is selectable in onboarding
4. [ ] Full autopilot option is selectable in settings
5. [ ] Delegation mode saved correctly to users table
6. [ ] Helpful description shown for full autopilot
7. [ ] Tooltip/help text is clear
8. [ ] Onboarding allows progression after selecting autopilot
9. [ ] Settings allow switching to/from autopilot mode
10. [ ] No console errors after enabling
