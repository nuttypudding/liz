---
id: 244
title: "Add Rent nav item to sidebar + bottom nav (landlord + tenant)"
tier: Sonnet
depends_on: []
feature: P2-001-rent-reminder
---

# 244 — Add "Rent" Navigation Item

## Objective

Add a "Rent" nav item (DollarSign icon) to the landlord sidebar, landlord bottom nav, and tenant bottom nav.

## Context

The nav items are defined in `app-sidebar.tsx` (landlord sidebar), `landlord-bottom-nav.tsx` (landlord mobile), and `(tenant)/layout.tsx` (tenant mobile). This task has no API dependency — it just links to the `/rent` page which will be built by other tasks.

See feature plan: Integration Points > Navigation.

## Implementation

1. **Landlord sidebar** (`components/layout/app-sidebar.tsx` or similar):
   - Add `{ title: "Rent", url: "/rent", icon: DollarSign }` after "Properties" and before "Settings"
   - Import `DollarSign` from `lucide-react`

2. **Landlord bottom nav** (`components/layout/landlord-bottom-nav.tsx` or similar):
   - Add "Rent" item with DollarSign icon in the same position
   - If 6+ items overflow, consider the "More" menu approach from the feature plan (Open Question 6), or keep all items with smaller icons — use your judgment

3. **Tenant bottom nav** (`app/(tenant)/layout.tsx` or equivalent):
   - Add "Rent" item with DollarSign icon between "Submit" and "Requests" (or appropriate position)

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] "Rent" nav item appears in landlord sidebar with DollarSign icon
3. [ ] "Rent" nav item appears in landlord bottom nav
4. [ ] "Rent" nav item appears in tenant bottom nav
5. [ ] Clicking "Rent" navigates to `/rent`
6. [ ] Active state highlights correctly when on `/rent` page
7. [ ] Mobile bottom nav remains usable (not too crowded)
8. [ ] All tests pass
