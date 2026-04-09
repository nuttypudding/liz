---
id: 033
title: Update onboarding wizard Step 2 — add apt_or_unit_no to property form
tier: Opus
depends_on: [26, 31]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 033 — Onboarding Step 2: Add Apt/Unit No. to Property Form

## Objective

Add the optional "Apt or Unit No." field to the property form in the onboarding wizard Step 2.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — Change 6 and "Step 2 Changes" UI section.

File: `apps/web/components/onboarding/onboarding-wizard.tsx`

## Implementation

1. Update `PropertyDraft` interface:
```typescript
interface PropertyDraft {
  name: string;
  address: string;
  apt_or_unit_no: string;  // NEW
  unit_count: string;
  monthly_rent: string;
}
```

2. Update `EMPTY_PROPERTY` default with `apt_or_unit_no: ""`

3. Add the field between address and the unit_count/monthly_rent grid:
```tsx
<div className="space-y-2">
  <Label htmlFor="apt_or_unit_no">Apt or Unit No.</Label>
  <Input
    id="apt_or_unit_no"
    placeholder="e.g. Suite 200, Unit B"
    value={property.apt_or_unit_no}
    onChange={(e) => updateProperty("apt_or_unit_no", e.target.value)}
  />
</div>
```

4. Field is optional — no validation required
5. Value persists when navigating back/forward between steps
6. Update Step 5 review to show apt/unit no. if provided

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] "Apt or Unit No." field appears between Address and units/rent grid
3. [ ] Field is optional — can proceed without filling it
4. [ ] Placeholder shows "e.g. Suite 200, Unit B"
5. [ ] Value persists when navigating back and forward
6. [ ] Value included in the handleSaveAll payload
