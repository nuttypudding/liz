---
id: 029
title: Install accordion shadcn component
tier: Haiku
depends_on: []
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 029 — Install Accordion shadcn Component

## Objective

Install the shadcn `accordion` component needed by the Utility Info Card (Work Stream 4).

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/utility-company-integration.md` — shadcn Components Needed table. Accordion is listed as "Needs install."

## Implementation

1. `cd apps/web`
2. Run: `npx shadcn@latest add accordion`
3. Verify `apps/web/components/ui/accordion.tsx` is created
4. Verify it exports `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] `apps/web/components/ui/accordion.tsx` exists
3. [ ] Component exports are correct
4. [ ] No build errors after installation
