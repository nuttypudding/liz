---
id: 027
title: Create PhoneInput component with auto-dash formatting
tier: Haiku
depends_on: []
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 027 — Create PhoneInput Component

## Objective

Build a reusable `<PhoneInput />` component that auto-formats US phone numbers with dashes as the user types (e.g., `714-243-3345`).

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — "Phone Number Formatting (Change 11)" section. Used by both TenantForm and VendorForm across onboarding and standalone pages.

## Implementation

Create `apps/web/components/ui/phone-input.tsx`:

1. Wrap shadcn `<Input />` (at `apps/web/components/ui/input.tsx`)
2. On `onChange`: strip non-digit characters, limit to 10 digits, insert dashes after positions 3 and 6
3. Display formatted value: `714-243-3345`
4. Expose `onValueChange(digits: string)` callback that returns raw digits
5. Accept `value` prop as raw digits string

```typescript
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
```

No external library needed — a ~30-line component.

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] Component created at `apps/web/components/ui/phone-input.tsx`
3. [ ] Typing `7142433345` displays `714-243-3345`
4. [ ] Deleting characters re-formats correctly
5. [ ] Pasting a full number formats correctly
6. [ ] `onValueChange` returns raw digits only
7. [ ] Max 10 digits enforced
8. [ ] Partial input formats correctly (e.g., 6 digits → `714-243`)
