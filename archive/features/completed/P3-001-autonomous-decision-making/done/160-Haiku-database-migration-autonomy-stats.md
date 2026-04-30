---
id: 160
title: Database migration — autonomy_monthly_stats table + maintenance_requests columns
tier: Haiku
depends_on: [159]
feature: P3-001-autonomous-decision-making
---

# 160 — Database Migration — Autonomy Monthly Stats & Request Updates

## Objective
Create the `autonomy_monthly_stats` table for aggregated decision metrics, and add autonomy-related columns to `maintenance_requests`.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

Monthly stats track aggregate autonomous decision performance (count, dispatch rate, escalation rate, override rate, spend, trust score). The maintenance_requests table needs new columns to link to autonomous decisions and track autonomy status.

## Implementation

1. Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_create_autonomy_monthly_stats.sql`
2. Define the `autonomy_monthly_stats` table with columns:
   - `id` (UUID, primary key)
   - `landlord_id` (UUID, foreign key to users, not null)
   - `month` (date, not null, first day of month)
   - `total_decisions` (integer, default 0)
   - `auto_dispatched` (integer, default 0)
   - `escalated` (integer, default 0)
   - `overridden` (integer, default 0)
   - `total_spend` (numeric, default 0)
   - `trust_score` (numeric 0-1, calculated based on override rate)
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())
3. Add unique constraint on (landlord_id, month)
4. Add RLS policy: landlords can only view/edit their own stats
5. Alter `maintenance_requests` table:
   - Add `autonomous_decision_id` (UUID, nullable, foreign key to autonomous_decisions)
   - Add `decided_autonomously` (boolean, default false)
6. Add index on maintenance_requests.autonomous_decision_id
7. Run migration locally and verify schema

## Acceptance Criteria
1. [ ] autonomy_monthly_stats table created with correct schema
2. [ ] Unique constraint enforces one record per landlord per month
3. [ ] RLS policies restrict access appropriately
4. [ ] maintenance_requests columns added successfully
5. [ ] Foreign key relationships validate
6. [ ] Indexes created for query performance
7. [ ] Migration runs without errors
8. [ ] Schema verified in Supabase Studio
