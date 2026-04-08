---
id: 038
title: Update standalone TenantForm — new fields, phone mask, custom fields, remove unit_number
tier: Opus
depends_on: [26, 27, 28, 31]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 038 — Standalone TenantForm: Full Update

## Objective

Update the standalone TenantForm (used on /properties page Sheet) with all changes: remove unit_number, add move-in date, lease type, rent due day, phone formatting, and custom fields.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — Changes 8-13.

File: `apps/web/components/forms/tenant-form.tsx`

## Implementation

1. **Remove** `unit_number` field from the form (keep column in DB for backward compat)
2. **Replace** phone `<Input>` with `<PhoneInput>` component (task 027)
3. **Add** new fields below existing contact fields:
   - Move-in date: `<Input type="date" />`
   - Lease type: `<Select>` with "Yearly", "Month to Month"
   - Rent due day: number input 1-31
4. **Add** `<CustomFields>` component (task 028) below standard fields
5. Update form layout to match:
```
[Name]                          (full width, required)
[Email]         [Phone]         (2-col, PhoneInput)
[Move-in date]  [Lease type]    (2-col, both optional)
[Rent due day]                  (half width, optional)
[+ Add field]                   (custom fields)
```
6. If editing existing tenant with `unit_number`, show as read-only "legacy" field

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] unit_number field removed (or read-only for existing tenants)
3. [ ] Phone field uses PhoneInput with auto-formatting
4. [ ] Move-in date, lease type, rent due day fields present
5. [ ] Custom fields component present with add/delete
6. [ ] All new fields save and reload correctly
7. [ ] Editing existing tenant pre-fills all fields
