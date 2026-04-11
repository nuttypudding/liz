---
id: 242
title: "Build Tenant Rent View page — current status card + payment history"
tier: Opus
depends_on: ["234"]
feature: P2-001-rent-reminder
---

# 242 — Build Tenant Rent View Page

## Objective

Build the tenant rent page at `/(tenant)/rent/page.tsx` showing the current month's rent status prominently and a scrollable payment history below.

## Context

Tenants see their own rent status and history. Data comes from `GET /api/tenant/rent` (task 234). Tenants cannot mark their own rent as paid.

See the feature plan's **Screen 3: Tenant Rent View** for the full component hierarchy and user flow.

**Follow the UI process**: Use `/ux-design` then `/ui-build` then `/ui-refine`.

## Implementation

### Components to Build

1. **`TenantRentPage`** — main page at `apps/web/app/(tenant)/rent/page.tsx`
2. **`CurrentRentCard`** — prominent card for current month: amount, due date, status badge, property info
   - Red/amber border when overdue
   - Note: "Payment is recorded by your landlord."
3. **`RentHistorySection`** — list of past months with status and amounts, sorted newest first
4. **`EmptyState`** — when no rent periods exist: "Your landlord hasn't set up rent tracking for your unit yet."

### Key Behaviors

- Mobile-first, single column layout
- Desktop: max-w-2xl mx-auto to constrain width
- Current month card is always at the top
- No action buttons for tenants (read-only)
- History shows all past periods with paid/overdue badges

### shadcn/ui Components

card, badge, separator, skeleton, scroll-area

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Page renders at `/(tenant)/rent` route
3. [ ] Current month rent card shows amount, due date, and status badge
4. [ ] Overdue status shows highlighted card border
5. [ ] Payment history section shows past months newest-first
6. [ ] No "mark paid" or action buttons (tenant is read-only)
7. [ ] Explanatory note about landlord recording payments
8. [ ] Empty state when no rent periods exist
9. [ ] Responsive: mobile-first, max-width constrained on desktop
10. [ ] Loading states with skeletons
11. [ ] All tests pass
