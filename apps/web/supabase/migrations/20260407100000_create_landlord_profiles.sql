-- Create landlord_profiles table for decision profiles
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

-- Add vendor preference columns
alter table vendors
  add column preferred boolean not null default false,
  add column priority_rank int default 0;

-- Reuse existing update_updated_at() function
create trigger set_updated_at_landlord_profiles
  before update on landlord_profiles
  for each row execute function update_updated_at();
