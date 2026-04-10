---
id: 209
title: Install missing shadcn components — sheet, calendar, accordion
tier: Haiku
depends_on: []
feature: P3-003-legal-compliance-engine
---

# 209 — Install Missing shadcn Components

## Objective
Install three shadcn/ui components required for compliance UI: `sheet`, `calendar`, and `accordion`. These are prerequisites for compliance dashboard, notice generator, and settings pages.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

The compliance module needs these components:
- **sheet** — For sidebar notices, side panels in compliance settings
- **calendar** — For selecting dates in notice generation and lease term configuration
- **accordion** — For organizing compliance rules by category in knowledge base UI

## Implementation

1. Navigate to project root (`/home/noelcacnio/Documents/repo/liz/`)

2. Install each component using shadcn CLI:
   ```bash
   npx shadcn-ui@latest add sheet
   npx shadcn-ui@latest add calendar
   npx shadcn-ui@latest add accordion
   ```

3. Verify installation:
   - Check `apps/web/components/ui/sheet.tsx` exists
   - Check `apps/web/components/ui/calendar.tsx` exists
   - Check `apps/web/components/ui/accordion.tsx` exists

4. Verify no TypeScript errors:
   ```bash
   cd apps/web && npm run type-check
   ```

5. Verify components can be imported:
   - `import { Sheet, SheetContent, SheetTrigger, ... } from "@/components/ui/sheet"`
   - `import { Calendar } from "@/components/ui/calendar"`
   - `import { Accordion, AccordionItem, ... } from "@/components/ui/accordion"`

## Acceptance Criteria
1. [ ] `sheet` component installed and importable
2. [ ] `calendar` component installed and importable
3. [ ] `accordion` component installed and importable
4. [ ] No TypeScript errors after installation
5. [ ] All three components available in `apps/web/components/ui/`
6. [ ] No breaking changes to existing components
