-- autonomy_monthly_stats: aggregated monthly decision metrics
create table autonomy_monthly_stats (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,
  month date not null,
  total_decisions integer not null default 0,
  auto_dispatched integer not null default 0,
  escalated integer not null default 0,
  overridden integer not null default 0,
  total_spend numeric not null default 0,
  trust_score numeric
    check (trust_score is null or (trust_score >= 0 and trust_score <= 1)),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(landlord_id, month)
);

create index idx_autonomy_monthly_stats_landlord_id on autonomy_monthly_stats(landlord_id);
create index idx_autonomy_monthly_stats_month on autonomy_monthly_stats(month);

-- Trigger for updated_at
create trigger set_updated_at_autonomy_monthly_stats
  before update on autonomy_monthly_stats
  for each row execute function update_updated_at();

-- Enable RLS
alter table autonomy_monthly_stats enable row level security;

-- RLS Policies: require authenticated user
-- Application layer ensures user is the landlord
create policy autonomy_monthly_stats_select_authenticated on autonomy_monthly_stats
  for select using (auth.role() = 'authenticated');

create policy autonomy_monthly_stats_insert_authenticated on autonomy_monthly_stats
  for insert with check (auth.role() = 'authenticated');

create policy autonomy_monthly_stats_update_authenticated on autonomy_monthly_stats
  for update using (auth.role() = 'authenticated');

-- Alter maintenance_requests table to add autonomy columns
alter table maintenance_requests
  add column autonomous_decision_id uuid references autonomous_decisions(id) on delete set null,
  add column decided_autonomously boolean not null default false;

create index idx_maintenance_requests_autonomous_decision on maintenance_requests(autonomous_decision_id);
