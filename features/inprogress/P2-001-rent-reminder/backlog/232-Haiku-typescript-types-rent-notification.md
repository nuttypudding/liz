---
id: 232
title: "TypeScript types — RentPeriod, RentSummary, Notification, NotificationType + extend LandlordProfile"
tier: Haiku
depends_on: ["231"]
feature: P2-001-rent-reminder
---

# 232 — TypeScript Types: Rent and Notification Interfaces

## Objective

Define TypeScript types for `RentPeriod`, `RentStatus`, `RentSummary`, `Notification`, and `NotificationType`. Extend the existing `LandlordProfile` interface with notification preference fields.

## Context

These types are used by every API route and UI component in the rent reminder feature. They must match the database schema created in task 231.

See the feature plan at `features/inprogress/P2-001-rent-reminder/README.md` (TypeScript Types section) for the full type definitions.

## Implementation

1. Check existing types in `apps/web/lib/types/` or `apps/web/types/` — find where the project defines shared interfaces (e.g., `Tenant`, `Property`, `LandlordProfile`).

2. Add `RentStatus` type (union of status strings), `RentPeriod` interface, `RentSummary` interface, `NotificationType` type, and `Notification` interface. Place them in the same file/pattern as existing types.

3. Extend `LandlordProfile` (wherever it's defined) with:
   - `notify_rent_reminders: boolean`
   - `notify_rent_overdue_summary: boolean`

4. Export all new types.

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] `RentStatus` type: `'upcoming' | 'due' | 'overdue' | 'partial' | 'paid'`
3. [ ] `RentPeriod` interface matches the feature plan schema
4. [ ] `RentSummary` interface with overdue/due/paid/upcoming counts and totals
5. [ ] `NotificationType` and `Notification` interfaces defined
6. [ ] `LandlordProfile` extended with two notification preference booleans
7. [ ] All types exported and importable
8. [ ] No TypeScript compilation errors
9. [ ] All tests pass
