---
id: 167
title: Install missing shadcn components — toggle-group, chart (if not installed)
tier: Haiku
depends_on: []
feature: P3-001-autonomous-decision-making
---

# 167 — Install Missing shadcn UI Components

## Objective
Install any missing shadcn UI components required for the autonomy dashboard and settings UI.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

The autonomy feature uses several UI components from shadcn that may not be installed yet: toggle-group (for mode toggles), chart (for monthly report graphs), and potentially others.

## Implementation

1. Check which components are already installed:
   ```bash
   ls apps/web/components/ui/
   ```
2. Install missing components as needed:
   - `toggle-group`: For autonomy mode selector (autopilot on/off). Run `npx shadcn-ui@latest add toggle-group`
   - `chart`: For monthly report (spend by category, decisions over time). Run `npx shadcn-ui@latest add chart` (may require recharts dependency)
   - `slider`: For confidence threshold slider on settings. Run `npx shadcn-ui@latest add slider` (if not present)
3. Verify installations in apps/web/components/ui/
4. Check for any dependency warnings or issues
5. Run `npm install` to ensure all dependencies are present
6. Verify no import errors in TypeScript

## Acceptance Criteria
1. [ ] toggle-group component installed
2. [ ] chart component installed (or alternative graphing lib ready)
3. [ ] slider component installed
4. [ ] All components importable from @/components/ui
5. [ ] No TypeScript compilation errors
6. [ ] No unmet peer dependencies
