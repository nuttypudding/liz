---
id: 245
title: "Extend Settings Notifications tab with rent toggles"
tier: Sonnet
depends_on: ["239"]
feature: P2-001-rent-reminder
---

# 245 — Extend Settings Notifications Tab with Rent Toggles

## Objective

Add rent reminder notification toggles to the existing Settings > Notifications tab.

## Context

The settings page already has a Notifications tab with toggles for emergency alerts and request alerts. This task adds a "Rent" section with two new toggles that read/write `notify_rent_reminders` and `notify_rent_overdue_summary` via the settings API (extended in task 239).

See the feature plan's **Screen 4: Notification Preferences** for the component hierarchy.

## Implementation

1. Find the Settings page: `apps/web/app/(landlord)/settings/page.tsx`
2. In the Notifications tab, after existing toggles, add:
   - A `Separator`
   - A section label "Rent" with description "Notifications about rent due dates and overdue payments"
   - Switch: "Rent reminders" — "Get notified about upcoming and overdue rent" → `notify_rent_reminders`
   - Switch: "Daily overdue summary" — "Receive a daily summary of overdue tenants" → `notify_rent_overdue_summary`
3. Wire the switches to the existing form state so they save with the existing Save button.

### shadcn/ui Components

switch, separator, card, tabs (all already installed)

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] "Rent" section appears in Notifications tab
3. [ ] "Rent reminders" toggle controls `notify_rent_reminders`
4. [ ] "Daily overdue summary" toggle controls `notify_rent_overdue_summary`
5. [ ] Toggles reflect saved state on page reload
6. [ ] Existing notification toggles are unchanged
7. [ ] Save button persists all settings including new toggles
8. [ ] All tests pass
