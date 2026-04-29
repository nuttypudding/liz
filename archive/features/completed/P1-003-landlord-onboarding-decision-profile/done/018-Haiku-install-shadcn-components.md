---
id: 018
title: Install missing shadcn components — slider, switch
tier: Haiku
depends_on: []
feature: landlord-onboarding-decision-profile
---

# 018 — Install Missing shadcn Components

## Objective
Install `slider` and `switch` shadcn/ui components needed for onboarding and settings.

## Context
Feature plan lists these as "Needs install". All other needed components (card, button, progress, select, badge, separator, tabs) are already installed.

## Implementation

1. `cd apps/web`
2. `npx shadcn@latest add slider`
3. `npx shadcn@latest add switch`
4. Verify new files exist in `components/ui/slider.tsx` and `components/ui/switch.tsx`
5. Run `npx tsc --noEmit` to verify no type errors

## Acceptance Criteria
1. [x] Verify correct model tier (Haiku)
2. [ ] `components/ui/slider.tsx` exists and compiles
3. [ ] `components/ui/switch.tsx` exists and compiles
4. [ ] No new TypeScript errors
