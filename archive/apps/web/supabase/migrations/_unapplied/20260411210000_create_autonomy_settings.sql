-- autonomy_settings: landlord preferences for autonomous decision-making
create table autonomy_settings (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null unique,
  confidence_threshold numeric not null default 0.85
    check (confidence_threshold >= 0 and confidence_threshold <= 1),
  per_decision_cap numeric not null default 500.00
    check (per_decision_cap > 0),
  monthly_cap numeric not null default 5000.00
    check (monthly_cap > 0),
  excluded_categories text[] default array[]::text[],
  preferred_vendors_only boolean not null default false,
  require_cost_estimate boolean not null default true,
  emergency_auto_dispatch boolean not null default true,
  rollback_window_hours integer not null default 24
    check (rollback_window_hours >= 0),
  paused boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_autonomy_settings_landlord_id on autonomy_settings(landlord_id);

-- Trigger for updated_at (reuse existing function)
create trigger set_updated_at_autonomy_settings
  before update on autonomy_settings
  for each row execute function update_updated_at();

-- Enable RLS
alter table autonomy_settings enable row level security;

-- RLS Policies: require authenticated user
-- Application layer handles specific authorization (ensure user is the landlord)
create policy autonomy_settings_select_authenticated on autonomy_settings
  for select using (auth.role() = 'authenticated');

create policy autonomy_settings_insert_authenticated on autonomy_settings
  for insert with check (auth.role() = 'authenticated');

create policy autonomy_settings_update_authenticated on autonomy_settings
  for update using (auth.role() = 'authenticated');

create policy autonomy_settings_delete_authenticated on autonomy_settings
  for delete using (auth.role() = 'authenticated');
