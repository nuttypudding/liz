---
id: 036
title: Update onboarding wizard Step 5 — review summary + handleSaveAll
tier: Opus
depends_on: [32, 33, 34, 35]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 036 — Onboarding Step 5: Review Summary + Save Handler

## Objective

Update the Step 5 review summary to display all new fields, and update `handleSaveAll` to send new fields to the API.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — "Step 5 Changes" and "handleSaveAll" sections.

File: `apps/web/components/onboarding/onboarding-wizard.tsx`

## Implementation

### Review Summary Updates
- **AI Preferences**: Reflect terminology changes ("Agent" not "AI")
- **Property**: Show apt/unit no. if provided
- **Tenants**: Remove unit_number display. Show move-in date, lease type, rent due day if provided. Show custom fields count ("3 custom fields") or list them.
- **Vendors**: Show rank per vendor. Show custom fields count.

### handleSaveAll Updates
- Property payload: include `apt_or_unit_no`
- Tenant payloads: include `move_in_date`, `lease_type`, `rent_due_day`, `custom_fields`; remove `unit_number`
- Vendor payloads: include `priority_rank`, `custom_fields`

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] AI Preferences section reflects "Agent" terminology
3. [ ] Property section shows apt/unit no. if provided
4. [ ] Tenant section does not show unit number
5. [ ] Tenant section shows new fields if provided
6. [ ] Vendor section shows rank per vendor
7. [ ] "Start Managing" saves all data including new fields
8. [ ] Redirects to /dashboard after save
9. [ ] All new fields persist in DB after save
