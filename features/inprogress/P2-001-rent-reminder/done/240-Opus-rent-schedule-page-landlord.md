---
id: 240
title: "Build Rent Schedule page (landlord) — table/card views, toolbar, filters, mark-paid dialog"
tier: Opus
depends_on: ["233"]
feature: P2-001-rent-reminder
---

# 240 — Build Rent Schedule Page (Landlord)

## Objective

Build the landlord Rent Schedule page at `/(landlord)/rent/page.tsx` with a desktop data table, mobile card list, toolbar with month/property/status filters, summary bar, and a "Mark Paid" dialog.

## Context

This is the landlord's primary tool for tracking rent payments. It uses `GET /api/rent` (task 233) for data and `PATCH /api/rent/[id]` to mark payments.

See the feature plan's **Screen 1: Rent Schedule Page** section for the full component hierarchy, shadcn/ui components, user flow, and responsive behavior.

**Follow the UI process**: Use `/ux-design` then `/ui-build` then `/ui-refine` as described in `docs/ui-process.md`.

## Implementation

### Components to Build

1. **`RentSchedulePage`** — main page component at `apps/web/app/(landlord)/rent/page.tsx`
2. **`RentToolbar`** — month selector, property filter, status filter, generate button
3. **`RentStatusSummaryBar`** — badges showing paid/due/overdue counts and total collected
4. **`RentTable`** — desktop data table (hidden on mobile)
5. **`RentCardList`** / **`RentCard`** — mobile card view (hidden on desktop)
6. **`MarkPaidDialog`** — dialog with amount (pre-filled), date (defaults today), notes fields

### Key Behaviors

- Default view: current month
- Month navigation: prev/next arrows with month label
- Filters: property dropdown, status dropdown
- Empty state: "Generate Rent Periods" button when no periods exist for selected month
- Mark Paid: opens dialog → PATCH `/api/rent/[id]` → refreshes list
- Partial payment: amount_paid < amount → status becomes 'partial'

### shadcn/ui Components

table, card, badge, button, select, skeleton, dialog, alert-dialog, input, label, textarea, separator, tooltip

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Page renders at `/(landlord)/rent` route
3. [ ] Desktop: data table with sortable columns
4. [ ] Mobile: card list with status badges and action buttons
5. [ ] Month navigation works (prev/next)
6. [ ] Property filter narrows results
7. [ ] Status filter narrows results
8. [ ] Summary bar shows correct counts and total collected
9. [ ] "Mark Paid" dialog opens, pre-fills amount, records payment via PATCH
10. [ ] Partial payment sets status to 'partial'
11. [ ] Empty state with "Generate Rent Periods" button
12. [ ] Generate button calls `POST /api/rent/generate` and refreshes
13. [ ] Loading states with skeletons
14. [ ] Responsive design (mobile/desktop breakpoint at lg)
15. [ ] All tests pass
