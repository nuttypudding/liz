---
id: 064
title: Add tenant lease card — inline lease summary on properties page
tier: Opus
depends_on: [55, 59]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 064 — Tenant Lease Card

## Objective

Add inline lease summary info to tenant cards on the /properties page, showing lease type, date range, due day, and computed status (Active/Expiring Soon/Expired).

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "Screen 5: Tenant Lease Card".

## Implementation

Modify tenant display in the properties page (`apps/web/app/(landlord)/properties/page.tsx`):

1. Below existing contact info, add a lease summary line (conditional — only if `lease_type` is set):
   - Lease type label
   - Date range (start–end, or "Month-to-month" with start only)
   - Rent due day
   - Status badge: Active (green), Expiring Soon (yellow, <60 days), Expired (red)

2. Lease status computation (client-side):
   - Active: `lease_end_date` is null (month-to-month) or `>= today`
   - Expiring Soon: `lease_end_date` within 60 days
   - Expired: `lease_end_date < today`

3. If no lease info set, no lease line shown

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Tenant with yearly lease shows full date range + status
3. [ ] Tenant with month-to-month shows type + start date
4. [ ] Expiring Soon badge (yellow) for leases ending within 60 days
5. [ ] Expired badge (red) for past-end-date leases
6. [ ] No lease line when tenant has no lease data
