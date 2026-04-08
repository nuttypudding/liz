---
id: 047
title: Build PropertyDrillDown component — tabbed layout
tier: Opus
depends_on: [46]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 047 — PropertyDrillDown Component

## Objective

Build the tabbed property drill-down view with Overview, Work Orders, Tenants, Documents, and Photos tabs.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Property Drill-Down View" architecture and screen designs.

## Implementation

Create `apps/web/components/dashboard/property-drilldown.tsx`:

1. **Props**: `propertyId: string`, `property: Property`

2. **PropertyHeader**: name, address, apt/unit no., quick stats (unit count, tenant count)

3. **Tabs** (shadcn `Tabs`):
   - **Overview**: placeholder for RentSummaryCard + filtered stats + chart + recent work orders (wired in task 053)
   - **Work Orders**: placeholder for WorkOrderHistory (wired in task 053)
   - **Tenants**: placeholder for TenantList (wired in task 053)
   - **Documents**: placeholder card (task 051)
   - **Photos**: placeholder card (task 051)

4. Tab persistence: when switching properties, preserve active tab

5. Loading skeleton layout for each tab section

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] PropertyHeader shows name, address, unit info
3. [ ] 5 tabs render: Overview, Work Orders, Tenants, Documents, Photos
4. [ ] Tab switching works
5. [ ] Active tab preserved when switching properties
6. [ ] Skeleton loading states for tab content
7. [ ] Mobile: tabs scroll horizontally
