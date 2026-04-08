---
id: 049
title: Build WorkOrderHistory component — table + mobile cards, pagination
tier: Opus
depends_on: [43]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 049 — WorkOrderHistory Component

## Objective

Build the work order history table for the property drill-down Work Orders tab — desktop Table view and mobile card list with pagination.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Screen Design: Property Drill-Down — Work Orders Tab".

## Implementation

Create `apps/web/components/dashboard/work-order-history.tsx`:

1. **Desktop (lg+)**: shadcn `Table` with columns: Date, Issue, Category, Urgency badge, Status badge
2. **Mobile (< lg)**: Stacked `RequestCard` components (existing at `components/requests/request-card.tsx`)
3. Sort: newest first
4. "Load more" button — paginated, 10 at a time
5. Props: `propertyId: string`
6. Fetches from `GET /api/requests?propertyId={id}&limit=10&offset=N`
7. Empty state: "No work orders yet" message
8. Reuse existing `UrgencyBadge` and `StatusBadge` components

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Table shows all request columns on desktop
3. [ ] Mobile renders as stacked cards
4. [ ] Sorted newest first
5. [ ] "Load more" loads next page
6. [ ] Empty state when no work orders
7. [ ] Urgency and status badges render correctly
