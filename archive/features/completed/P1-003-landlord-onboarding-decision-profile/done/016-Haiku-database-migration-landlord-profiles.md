---
id: 016
title: Database migration — landlord_profiles table + vendor columns
tier: Haiku
depends_on: []
feature: landlord-onboarding-decision-profile
---

# 016 — Database Migration: landlord_profiles Table + Vendor Columns

## Objective
Create the `landlord_profiles` table and add `preferred`/`priority_rank` columns to `vendors`.

## Context
Feature plan: `features/inprogress/P1-003-landlord-onboarding-decision-profile/README.md`
Existing migrations: `apps/web/supabase/migrations/`
Pattern: Sequential timestamped SQL files.

## Implementation

1. Create migration file `apps/web/supabase/migrations/<timestamp>_create_landlord_profiles.sql`:
```sql
create table landlord_profiles (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null unique,
  risk_appetite text not null default 'balanced',
  delegation_mode text not null default 'assist',
  max_auto_approve decimal(10,2) default 0,
  notify_emergencies boolean not null default true,
  notify_all_requests boolean not null default false,
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_landlord_profiles_landlord on landlord_profiles(landlord_id);

alter table vendors
  add column preferred boolean not null default false,
  add column priority_rank int default 0;
```

2. Add `updated_at` trigger for landlord_profiles (same pattern as maintenance_requests).

3. Run migration locally: restart supabase or `supabase db reset`.

4. Apply to cloud QA via Supabase MCP `apply_migration`.

5. Add `LandlordProfile` type to `apps/web/lib/types.ts`.

## Acceptance Criteria
1. [x] Verify correct model tier (Haiku)
2. [ ] `landlord_profiles` table exists locally and in cloud
3. [ ] `vendors` table has `preferred` and `priority_rank` columns
4. [ ] `LandlordProfile` TypeScript interface added to `lib/types.ts`
5. [ ] `updated_at` trigger works on landlord_profiles
