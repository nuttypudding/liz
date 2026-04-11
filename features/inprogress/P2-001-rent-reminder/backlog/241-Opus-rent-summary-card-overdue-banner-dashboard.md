---
id: 241
title: "Build Rent Summary Card + Overdue Banner for dashboard"
tier: Opus
depends_on: ["235"]
feature: P2-001-rent-reminder
---

# 241 — Build Rent Summary Card + Overdue Rent Banner for Dashboard

## Objective

Add a `RentSummaryCard` and `OverdueRentBanner` to the landlord dashboard, displaying rent health metrics and an alert for overdue tenants.

## Context

The dashboard at `/(landlord)/dashboard/page.tsx` already has a similar `EmergencyAlertBanner` and may have a `LatePaymentBanner` and `RentSummaryCard` from prior work. Check existing components in `apps/web/components/dashboard/` — extend or replace them to match the feature plan.

Data comes from `GET /api/dashboard/rent-summary` (task 235). Add this fetch to the dashboard's existing `Promise.all()`.

See the feature plan's **Screen 2: Rent Status Section on Dashboard** and **Screen 5: Overdue Alert Banner** for component hierarchies.

## Implementation

### `OverdueRentBanner`
- Location: `apps/web/components/dashboard/overdue-rent-banner.tsx`
- Amber color scheme (distinct from red emergency banner)
- Shows when `overdue_count > 0`
- "Review Now" button links to `/rent?status=overdue`
- `role="alert"` and `aria-live="polite"` for accessibility

### `RentSummaryCard`
- Location: `apps/web/components/dashboard/rent-summary-card.tsx`
- Card with 4-metric grid: Overdue (red), Due Soon (amber), Paid (green), Collected ($total bold)
- Positioned below existing stats grid on dashboard

### Dashboard Integration
- Add `GET /api/dashboard/rent-summary` to the dashboard's data fetching
- Render `OverdueRentBanner` below `EmergencyAlertBanner`
- Render `RentSummaryCard` below existing `SectionCards`

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] `OverdueRentBanner` appears when overdue_count > 0
3. [ ] `OverdueRentBanner` hidden when no overdue tenants
4. [ ] Banner uses amber color scheme (not red)
5. [ ] "Review Now" navigates to `/rent?status=overdue`
6. [ ] Banner has `role="alert"` and `aria-live="polite"`
7. [ ] `RentSummaryCard` shows 4 metrics with correct colors
8. [ ] Dashboard handles zero rent periods gracefully (shows zeros)
9. [ ] Loading states for both components
10. [ ] All tests pass
