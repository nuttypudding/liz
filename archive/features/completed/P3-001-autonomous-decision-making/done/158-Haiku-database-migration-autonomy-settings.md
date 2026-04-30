---
id: 158
title: Database migration — autonomy_settings table
tier: Haiku
depends_on: []
feature: P3-001-autonomous-decision-making
---

# 158 — Database Migration — Autonomy Settings Table

## Objective
Create the `autonomy_settings` table to store per-landlord autonomy configuration and preferences.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

This table captures landlord preferences for autonomous decision-making, including confidence thresholds, spending caps, category exclusions, vendor preferences, and emergency handling options.

## Implementation

1. Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_create_autonomy_settings.sql`
2. Define the `autonomy_settings` table with columns:
   - `id` (UUID, primary key)
   - `landlord_id` (UUID, foreign key to users, not null)
   - `confidence_threshold` (numeric 0-1, default 0.85)
   - `per_decision_cap` (numeric, default 500.00)
   - `monthly_cap` (numeric, default 5000.00)
   - `excluded_categories` (text array, default empty)
   - `preferred_vendors_only` (boolean, default false)
   - `require_cost_estimate` (boolean, default true)
   - `emergency_auto_dispatch` (boolean, default true)
   - `rollback_window_hours` (integer, default 24)
   - `paused` (boolean, default false)
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())
3. Add unique constraint on `landlord_id` (one settings record per landlord)
4. Add check constraints:
   - `confidence_threshold >= 0 AND confidence_threshold <= 1`
   - `per_decision_cap > 0`
   - `monthly_cap > 0`
   - `rollback_window_hours >= 0`
5. Enable RLS policy: landlords can only view/edit their own settings
6. Run migration locally and verify schema in Supabase Studio

## Acceptance Criteria
1. [ ] Migration file created and named correctly
2. [ ] Table exists with all required columns
3. [ ] Unique constraint on landlord_id enforced
4. [ ] Check constraints validate numeric ranges
5. [ ] RLS policies restrict access to own settings
6. [ ] Migration runs without errors in local Supabase
7. [ ] Schema verified in Supabase Studio
