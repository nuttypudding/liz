---
id: 053
title: Integrate all drill-down sections — wire API calls, loading, errors, empty states
tier: Opus
depends_on: [47, 48, 49, 50, 51, 52]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 053 — Integrate All Drill-Down Sections

## Objective

Wire all drill-down tab components together: API calls, loading states, error handling, empty states, and data flow between parent and child components.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Data Flow" and "Integration Points" sections.

## Implementation

In `apps/web/components/dashboard/property-drilldown.tsx`:

### Overview Tab
1. Fetch rent status via GET `/api/properties/[id]/rent-status`
2. Fetch filtered stats via GET `/api/dashboard/stats?propertyId={id}`
3. Fetch filtered chart via GET `/api/dashboard/spend-chart?propertyId={id}`
4. Wire `RentSummaryCard`, `LatePaymentBanner`, filtered `SectionCards`, `SpendChart`
5. Recent work orders: show top 3 with "View all" link → switches to Work Orders tab

### Work Orders Tab
6. Wire `WorkOrderHistory` with `propertyId` prop

### Tenants Tab
7. Wire `DrilldownTenantList` with property's tenants

### Documents + Photos Tabs
8. Render placeholder components

### Aggregate View
9. Add `LatePaymentBanner` to aggregate view (fetch rent status for all properties)

### Data Flow
10. Parallel fetches on mount/property change
11. Skeleton loading for each section
12. Error handling: show error card, retry button
13. Empty states for sections with no data

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Overview tab shows rent summary, filtered stats, chart, recent work orders
3. [ ] Work Orders tab shows full history
4. [ ] Tenants tab shows editable list
5. [ ] Documents/Photos tabs show placeholders
6. [ ] Loading skeletons during fetches
7. [ ] Error states with retry
8. [ ] Empty states for no-data sections
9. [ ] Data refreshes when switching properties
10. [ ] Aggregate view includes late payment banner
