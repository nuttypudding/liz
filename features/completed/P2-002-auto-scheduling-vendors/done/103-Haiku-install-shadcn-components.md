---
id: 103
title: Install missing shadcn components — calendar, popover, toggle-group
tier: Haiku
depends_on: []
feature: P2-002-auto-scheduling-vendors
---

# 103 — Install missing shadcn components

## Objective

Install missing shadcn/ui components needed for the vendor availability and scheduling UI.

## Context

The project uses shadcn/ui for component library. This task installs three components:
- **calendar** — for date selection in tenant availability prompt and scheduling modal
- **popover** — for availability rule editing and slot picker overlays
- **toggle-group** — for day-of-week selection in vendor availability rules

Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation

Use `npx shadcn-ui@latest add` to install each component into `apps/web`:

```bash
cd apps/web
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add toggle-group
```

Verify installation:
- Components should appear in `apps/web/components/ui/`
- No build errors
- Components can be imported in TypeScript

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] All three components installed successfully
3. [ ] Components appear in `apps/web/components/ui/`
4. [ ] No build errors or import warnings
5. [ ] Components are importable in TypeScript files
