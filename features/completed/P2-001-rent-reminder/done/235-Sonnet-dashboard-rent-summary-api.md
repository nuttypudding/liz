---
id: 235
title: "Dashboard rent summary API — GET /api/dashboard/rent-summary"
tier: Sonnet
depends_on: ["231", "232"]
feature: P2-001-rent-reminder
---

# 235 — Dashboard Rent Summary API

## Objective

Implement `GET /api/dashboard/rent-summary` to return aggregated rent statistics for the landlord's dashboard.

## Context

The dashboard shows a RentSummaryCard with overdue/due/paid/upcoming counts and total collected. This endpoint aggregates rent_periods data for the current month.

Follow existing dashboard API patterns — see `GET /api/dashboard/stats` for reference.

## Implementation

### `GET /api/dashboard/rent-summary`
- Auth: Clerk + landlord role
- Query `rent_periods` where `landlord_id = userId` and `period_month` = current month's first day
- Aggregate:
  - `overdue_count`: count where status = 'overdue'
  - `due_count`: count where status = 'due'
  - `paid_count`: count where status = 'paid'
  - `upcoming_count`: count where status = 'upcoming'
  - `total_owed`: sum of `amount` across all statuses
  - `total_collected`: sum of `amount_paid` where status in ('paid', 'partial')
- Return `{ data: RentSummary }`
- Return zeros if no rent periods exist for the current month

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Returns correct counts for each status category
3. [ ] Returns correct `total_owed` and `total_collected` sums
4. [ ] Only includes current month's data
5. [ ] Only includes the authenticated landlord's data
6. [ ] Returns zero values (not error) when no rent periods exist
7. [ ] Returns 401/403 for unauthorized requests
8. [ ] All tests pass
