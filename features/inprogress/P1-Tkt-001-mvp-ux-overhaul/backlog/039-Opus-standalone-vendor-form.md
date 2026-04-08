---
id: 039
title: Update standalone VendorForm — ranking UI + custom fields
tier: Opus
depends_on: [26, 28, 31]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 039 — Standalone VendorForm: Ranking + Custom Fields

## Objective

Add vendor ranking UI and custom fields to the standalone VendorForm on the /vendors page.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — Changes 14-15.

File: `apps/web/components/forms/vendor-form.tsx`

## Implementation

1. Add rank column/badge to vendor cards — group by specialty, show rank within group
2. Add `priority_rank` selector to VendorForm (use existing `priority_rank` column)
3. Add `<CustomFields>` component (task 028) below the Notes field
4. Phone field: also apply `<PhoneInput>` for consistency with tenant form
5. Update vendor card display to show rank badge and custom field indicators

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Vendor rank selector in VendorForm
3. [ ] Rank saved via `priority_rank` column
4. [ ] Custom fields component present with add/delete
5. [ ] Custom fields saved as JSONB and reload correctly
6. [ ] Vendor cards show rank badge
7. [ ] Phone formatting applied (PhoneInput)
