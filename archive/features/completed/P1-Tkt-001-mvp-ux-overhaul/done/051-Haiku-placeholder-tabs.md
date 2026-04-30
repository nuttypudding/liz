---
id: 051
title: Build DocumentsPlaceholder and PhotosPlaceholder components
tier: Haiku
depends_on: [47]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 051 — Documents + Photos Placeholder Tabs

## Objective

Build static placeholder components for the Documents and Photos tabs in the property drill-down.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Screen Design: Documents Tab" and "Photos Tab" placeholders.

## Implementation

Create two simple card components:

### `apps/web/components/dashboard/documents-placeholder.tsx`
```tsx
// Card with FileText icon, title "Lease & Document Management"
// Bullet list: Lease agreements, Month-to-month tracking, Work order receipts, Inspection reports
// Note: "Coming soon"
```

### `apps/web/components/dashboard/photos-placeholder.tsx`
```tsx
// Card with Camera icon, title "Property Photos"
// Bullet list: Property photos, Move-in/out inspection photos, Before/after maintenance photos
// Note: "Coming soon"
```

Both use shadcn `Card` component with centered icon + description layout.

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] Documents placeholder shows coming-soon messaging with feature list
3. [ ] Photos placeholder shows coming-soon messaging with feature list
4. [ ] Both use consistent card styling
