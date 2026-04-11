---
id: 181
title: Database migration — extend landlord_profiles with screening preferences
tier: Haiku
depends_on: [180]
feature: P3-002-ai-tenant-screening
---

# 181 — Database migration — extend landlord_profiles with screening preferences

## Objective
Add screening configuration columns to the `landlord_profiles` table to store each landlord's screening provider preferences, income requirements, and policy settings (eviction history, background check requirements).

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Depends on: Task 180 (applications table must exist first for FK references if needed).

Extension to existing `landlord_profiles` table in Supabase PostgreSQL.

## Implementation

### 1. Add screening preference columns

```sql
alter table public.landlord_profiles
  add column if not exists screening_provider text default 'smartmove', -- 'smartmove', 'checkr', etc.
  add column if not exists min_income_ratio numeric(3, 1) default 3.0, -- min annual income / monthly rent ratio
  add column if not exists auto_reject_eviction_history boolean default true, -- auto-deny if eviction history present
  add column if not exists require_background_check boolean default true, -- require background check to proceed
  add column if not exists screening_updated_at timestamp with time zone default now();
```

### 2. Add index for screening-related queries

```sql
create index if not exists landlord_profiles_screening_provider_idx
  on public.landlord_profiles(screening_provider);
```

### 3. Verify update trigger on landlord_profiles

Ensure `updated_at` trigger exists and fires on update. If not, add:

```sql
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_landlord_profiles_updated_at
  before update on public.landlord_profiles
  for each row
  execute function public.update_updated_at_column();
```

## Acceptance Criteria
1. [ ] All five columns added to landlord_profiles
2. [ ] Default values match product requirements (min_income_ratio: 3.0, require_background_check: true, etc.)
3. [ ] Screening provider column enum-constrained or documented as text
4. [ ] Index on screening_provider created
5. [ ] Migration file saved to `supabase/migrations/`
6. [ ] Local database updated with `supabase db push`
7. [ ] TypeScript types updated to include new fields (task 182)
8. [ ] Dashboard/settings UI can read/write these fields (future task)
