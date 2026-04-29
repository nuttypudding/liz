---
id: 239
title: "Extend settings API + profile — add notify_rent_reminders, notify_rent_overdue_summary fields"
tier: Sonnet
depends_on: ["231"]
feature: P2-001-rent-reminder
---

# 239 — Extend Settings API with Rent Notification Preferences

## Objective

Wire up the two new notification preference columns (`notify_rent_reminders`, `notify_rent_overdue_summary`) in the settings profile API so the frontend can read and update them.

## Context

Task 231 adds the columns to `landlord_profiles`. This task extends the existing `PUT /api/settings/profile` (or equivalent) to accept and persist these booleans. Task 232 extends the `LandlordProfile` TypeScript type.

Check the existing settings API at `apps/web/app/api/settings/profile/route.ts`.

## Implementation

1. **`GET /api/settings/profile`** (or wherever profile is fetched): Include `notify_rent_reminders` and `notify_rent_overdue_summary` in the response.

2. **`PUT /api/settings/profile`**: Accept `notify_rent_reminders` (boolean) and `notify_rent_overdue_summary` (boolean) in the request body. Update the `landlord_profiles` row.

3. Ensure the frontend profile fetch picks up the new fields (check the profile hook/fetch in the settings page).

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] GET profile response includes both notification preference fields
3. [ ] PUT profile accepts and saves both boolean fields
4. [ ] Default values (true) are returned when columns haven't been explicitly set
5. [ ] Existing settings fields are not affected
6. [ ] All tests pass
