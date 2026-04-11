---
id: 231
title: "Database migration — rent_periods, notifications tables + properties.rent_due_day + landlord_profiles notification columns"
tier: Haiku
depends_on: []
feature: P2-001-rent-reminder
---

# 231 — Database Migration: Rent Periods, Notifications, and Schema Extensions

## Objective

Create a Supabase migration that adds the `rent_periods` and `notifications` tables, extends `properties` with `rent_due_day`, and extends `landlord_profiles` with notification preference columns.

## Context

This is the foundation migration for the Rent Reminder feature (P2-001). All subsequent tasks depend on these tables existing.

**Important**: The codebase may already have some rent-related schema (`rent_payments`, `payment_periods`, `properties.rent_due_day`) from prior work. Check existing migrations in `apps/web/supabase/migrations/` before creating new ones. If `rent_due_day` already exists on `properties`, skip that ALTER. If `payment_periods` exists, evaluate whether `rent_periods` should replace it or coexist — follow the feature plan's schema definition but use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` guards where appropriate.

See the feature plan at `features/inprogress/P2-001-rent-reminder/README.md` for the full schema definition (Data Model section).

## Implementation

1. Create a new migration file in `apps/web/supabase/migrations/` with the current timestamp.

2. **`rent_periods` table** — see feature plan Data Model section for full DDL including indexes and trigger.

3. **`notifications` table** — see feature plan Data Model section.

4. **`properties` extension** — `ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_due_day integer NOT NULL DEFAULT 1 CONSTRAINT chk_rent_due_day CHECK (rent_due_day >= 1 AND rent_due_day <= 28);`

5. **`landlord_profiles` extension** — add `notify_rent_reminders` (boolean, default true) and `notify_rent_overdue_summary` (boolean, default true).

6. Test the migration locally: `cd apps/web && npx supabase db reset` (or `npx supabase migration up`).

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] Migration file created in `apps/web/supabase/migrations/`
3. [ ] `rent_periods` table created with all columns, indexes, unique constraint, and trigger
4. [ ] `notifications` table created with all columns and indexes
5. [ ] `properties.rent_due_day` column exists (added or already present)
6. [ ] `landlord_profiles` has `notify_rent_reminders` and `notify_rent_overdue_summary` columns
7. [ ] Migration applies cleanly on a fresh database (`supabase db reset`)
8. [ ] No duplicate column/table errors if run against existing schema
9. [ ] All tests pass
