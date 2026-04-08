---
id: 028
title: Create CustomFields reusable component (key-value pairs)
tier: Haiku
depends_on: []
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 028 — Create CustomFields Reusable Component

## Objective

Build a reusable `<CustomFields />` component that renders editable key-value pair rows with an "Add field" button. Used by both TenantForm and VendorForm.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — "Custom Fields (Changes 13, 15)" section. Stored as JSONB `Record<string, string>` in the database.

## Implementation

Create `apps/web/components/ui/custom-fields.tsx`:

1. Props: `value: Record<string, string>`, `onChange: (fields: Record<string, string>) => void`, optional `maxFields?: number` (default 10)
2. Renders existing key-value pairs as rows: `[Label input] [Value input] [X delete button]`
3. "Add field" button appends a new empty row
4. Each row uses shadcn `<Input />` for label and value
5. Delete button uses shadcn `<Button variant="ghost" size="icon">`
6. On save: serialize internal state to `Record<string, string>`
7. Empty labels/values are stripped on serialization

Use shadcn components already installed: `Input`, `Button`, `Label`.

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] Component created at `apps/web/components/ui/custom-fields.tsx`
3. [ ] Can add a new key-value field row
4. [ ] Can edit label and value in each row
5. [ ] Can delete a field row
6. [ ] Maximum field count enforced (default 10)
7. [ ] Empty rows stripped from output
8. [ ] `onChange` fires with `Record<string, string>` on any edit
9. [ ] Works in both controlled and initial-value modes
