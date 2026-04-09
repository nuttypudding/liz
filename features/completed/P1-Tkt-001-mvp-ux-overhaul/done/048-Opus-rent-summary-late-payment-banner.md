---
id: 048
title: Build RentSummaryCard + LatePaymentBanner components
tier: Opus
depends_on: [41]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 048 — RentSummaryCard + LatePaymentBanner

## Objective

Build the rent summary card (monthly rent, last paid, status indicator) and late payment alert banner.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Screen Design: Property Drill-Down — Overview Tab" and "Late Payment Banner" sections.

## Implementation

### RentSummaryCard
Create `apps/web/components/dashboard/rent-summary-card.tsx`:
- Card showing: monthly rent amount, last paid date, status indicator (green dot = current, red dot = overdue)
- "Record Payment" button (triggers dialog in task 052)
- Props: `rentStatus: RentStatus`

### LatePaymentBanner
Create `apps/web/components/dashboard/late-payment-banner.tsx`:
- Same visual pattern as `EmergencyAlertBanner` (red card, AlertTriangle icon)
- Shows days overdue and monthly rent amount
- **Single property**: "Rent is X days overdue ($1,800/mo). Last paid: Mar 1."
- **Aggregate**: "N properties have overdue rent. [Review]"
- Props: `rentStatuses: RentStatus[]` or `rentStatus: RentStatus`

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] RentSummaryCard shows amount, last paid, status
3. [ ] Green indicator when current, red when overdue
4. [ ] "Record Payment" button present
5. [ ] LatePaymentBanner shows for single property when overdue
6. [ ] LatePaymentBanner shows aggregate count in "All" view
7. [ ] Banner hidden when all rent is current
8. [ ] Matches EmergencyAlertBanner visual style
