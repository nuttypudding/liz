---
id: 037
title: Update standalone PropertyForm with apt_or_unit_no
tier: Opus
depends_on: [26, 31]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 037 — Standalone PropertyForm: Add Apt/Unit No.

## Objective

Add the "Apt or Unit No." field to the standalone PropertyForm used on the /properties page.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — Change 6.

File: `apps/web/components/forms/property-form.tsx`

## Implementation

1. Update `PropertyFormData` interface to include `apt_or_unit_no`
2. Add field between address and unit_count/monthly_rent grid
3. Label: "Apt or Unit No." — optional, no validation required
4. Placeholder: "e.g. Suite 200, Unit B"
5. When editing an existing property, pre-fill from property data
6. Display `apt_or_unit_no` in property card header if present (on /properties page)

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Field appears in PropertyForm between address and units/rent
3. [ ] Field is optional
4. [ ] Value saves and reloads correctly
5. [ ] Editing an existing property shows the value
6. [ ] Property card shows apt/unit no. if present
