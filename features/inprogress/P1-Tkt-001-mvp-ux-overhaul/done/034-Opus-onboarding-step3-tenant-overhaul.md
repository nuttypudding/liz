---
id: 034
title: Update onboarding wizard Step 3 — tenant form overhaul
tier: Opus
depends_on: [26, 27, 28, 31]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 034 — Onboarding Step 3: Tenant Form Overhaul

## Objective

Overhaul the tenant entry form in Step 3 of the onboarding wizard: prominent property header, new lease fields, phone formatting, remove unit_number, add custom fields.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — Changes 7-13 and "Step 3 Changes" UI section.

File: `apps/web/components/onboarding/onboarding-wizard.tsx`

## Implementation

### Change 7 — Property Name Header
```tsx
<CardTitle className="flex items-center gap-2">
  <Users className="size-5" />
  Add tenants for {property.name || "your property"}
</CardTitle>
<CardDescription>You can always add more later.</CardDescription>
```

### Change 12 — Remove unit_number
- Remove `unit_number` from `TenantEntry` interface and `EMPTY_TENANT`
- Remove unit_number input from the inline form
- Remove from tenant list display and Step 5 review

### Changes 8-10 — New Fields
Update `TenantEntry`:
```typescript
interface TenantEntry {
  name: string;
  email: string;
  phone: string;
  move_in_date: string;
  lease_type: string;
  rent_due_day: string;
  custom_fields: Array<{ key: string; value: string }>;
}
```

Form layout:
```
[Name]                          (full width, required)
[Email]         [Phone]         (2-col, PhoneInput for phone)
[Move-in date]  [Lease type]    (2-col, both optional)
[Rent due day]                  (half width, optional)
[+ Add field]                   (CustomFields component)
```

### Change 11 — Phone Formatting
Replace `<Input>` for phone with `<PhoneInput>` component (task 027)

### Change 13 — Custom Fields
Add `<CustomFields>` component (task 028) below standard fields

### Tenant List Display
Update the tenant list to show new fields and omit unit_number.

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Header reads "Add tenants for {Property Name}"
3. [ ] Unit number field is NOT present
4. [ ] Move-in date picker works
5. [ ] Lease type dropdown offers "Yearly" and "Month to Month"
6. [ ] Rent due day accepts values 1-31
7. [ ] Phone auto-formats with dashes (PhoneInput)
8. [ ] "Add field" button adds custom key-value rows
9. [ ] Can add/delete multiple custom fields
10. [ ] Added tenant appears in list with new field data
11. [ ] Tenant list no longer shows unit designation
12. [ ] Navigating back/forward preserves all data
