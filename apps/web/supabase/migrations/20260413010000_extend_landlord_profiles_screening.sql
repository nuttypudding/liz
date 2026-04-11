-- Extend landlord_profiles with screening preferences
alter table public.landlord_profiles
  add column if not exists screening_provider text default 'smartmove', -- 'smartmove', 'checkr', etc.
  add column if not exists min_income_ratio numeric(3, 1) default 3.0, -- min annual income / monthly rent ratio
  add column if not exists auto_reject_eviction_history boolean default true, -- auto-deny if eviction history present
  add column if not exists require_background_check boolean default true, -- require background check to proceed
  add column if not exists screening_updated_at timestamp with time zone default now();

-- Add index for screening-related queries
create index if not exists landlord_profiles_screening_provider_idx
  on public.landlord_profiles(screening_provider);
