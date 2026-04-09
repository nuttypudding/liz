---
id: 035
title: Update onboarding wizard Step 4 — vendor ranking + custom fields
tier: Opus
depends_on: [26, 28, 31]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 035 — Onboarding Step 4: Vendor Ranking + Custom Fields

## Objective

Add vendor ranking selector and custom fields to the vendor entry form in Step 4 of the onboarding wizard.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — Changes 14-15 and "Step 4 Changes" UI section.

File: `apps/web/components/onboarding/onboarding-wizard.tsx`

## Implementation

### Change 14 — Vendor Ranking
- After adding a vendor, show a rank badge/number next to each vendor in the list
- Simple `<Select>` per vendor with rank options ("1st", "2nd", "3rd", etc.)
- When a rank is selected, bump any other vendor with that rank
- Use existing `priority_rank` column on vendors table

### Change 15 — Custom Fields
- Add `<CustomFields>` component (task 028) below the Notes field in the vendor inline form
- Common use cases: fax, physical address, contact person, license number

### Vendor List Display
Update the vendor list to show rank badge and custom field count

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Vendor rank selector appears for each added vendor
3. [ ] Can set rank 1st, 2nd, 3rd per vendor
4. [ ] Setting rank on one vendor adjusts others if conflict
5. [ ] "Add field" button appears at bottom of vendor form
6. [ ] Can add custom fields (e.g., fax, address)
7. [ ] Custom fields persist in vendor list display
8. [ ] Data preserved when navigating between steps
