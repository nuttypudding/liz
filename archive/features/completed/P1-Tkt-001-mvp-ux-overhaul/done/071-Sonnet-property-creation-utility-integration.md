---
id: 071
title: Property creation integration — post-create prompt to auto-detect utilities
tier: Sonnet
depends_on: [67, 69]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 071 — Property Creation Utility Integration

## Objective

After a landlord creates a new property, prompt them to auto-detect utility providers via the UtilitySetupSheet.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/utility-company-integration.md` — "Property Creation Flow" integration section.

## Implementation

In `apps/web/app/(landlord)/properties/page.tsx` (or wherever property creation success is handled):

1. After successful POST `/api/properties`, show toast: "Property added! Would you like to auto-detect utility providers?"
2. Toast action button: "Auto-Detect" → opens UtilitySetupSheet with new property's address
3. If dismissed: utility card shows empty state with "Auto-Detect" button

Client-side integration only — no backend coupling.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Toast appears after property creation
3. [ ] "Auto-Detect" opens UtilitySetupSheet
4. [ ] AI suggestions fetch for the new address
5. [ ] Dismissing toast is non-destructive
