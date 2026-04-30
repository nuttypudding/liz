---
id: 193
title: Install missing shadcn components — checkbox, alert
tier: Haiku
depends_on: []
feature: P3-002-ai-tenant-screening
---

# 193 — Install missing shadcn components — checkbox, alert

## Objective
Install shadcn UI components needed for the screening UI: checkbox (for consent forms, fair housing compliance confirmation) and alert (for status messages, compliance warnings).

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Project uses shadcn/ui for component library. Install checkbox and alert if not already present.

## Implementation

### 1. Install components

```bash
cd /home/noelcacnio/Documents/repo/liz/apps/web

# Install checkbox component
npx shadcn-ui@latest add checkbox

# Install alert component
npx shadcn-ui@latest add alert
```

### 2. Verify installation

After installation, verify files exist:

```bash
ls -la apps/web/components/ui/checkbox.tsx
ls -la apps/web/components/ui/alert.tsx
```

### 3. Export from components index (if needed)

Update `apps/web/components/index.ts` (or equivalent barrel export) if using centralized exports:

```typescript
export { Checkbox } from './ui/checkbox';
export { Alert, AlertTitle, AlertDescription } from './ui/alert';
```

## Acceptance Criteria
1. [ ] `checkbox.tsx` installed in components/ui/
2. [ ] `alert.tsx` installed in components/ui/
3. [ ] Both components export expected exports (Checkbox, Alert, AlertTitle, AlertDescription)
4. [ ] Components are styled with Tailwind CSS
5. [ ] Components support accessibility (ARIA attributes)
6. [ ] No build errors when importing in task files
7. [ ] Components available for UI tasks (194–198)
