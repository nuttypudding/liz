---
id: 052
title: Build rent payment recording dialog
tier: Sonnet
depends_on: [42, 48]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 052 — Rent Payment Recording Dialog

## Objective

Build the "Record Payment" dialog triggered from the RentSummaryCard, with amount (pre-filled), date, and notes fields.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Rent Payment Recording" testing checklist.

## Implementation

Create `apps/web/components/dashboard/record-payment-dialog.tsx`:

1. Triggered by "Record Payment" button on RentSummaryCard
2. shadcn `Dialog` with form fields:
   - Amount (pre-filled with `monthly_rent`)
   - Date (default: today)
   - Period start/end (auto-computed from date, editable)
   - Notes (optional)
3. Submit → POST `/api/properties/[id]/rent-payments`
4. On success: toast, close dialog, refresh rent status
5. Validation: amount required, date required, no future dates

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Dialog opens from "Record Payment" button
3. [ ] Amount pre-filled with monthly rent
4. [ ] Date defaults to today
5. [ ] Submit saves payment and refreshes status
6. [ ] Overdue banner disappears after recording current-period payment
7. [ ] Validation prevents empty amount or future dates
