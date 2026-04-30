-- Test Lab schema: test_runs and test_cases for isolated component testing

create table if not exists test_runs (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,
  component_name text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  total_cases int not null default 0,
  passed_cases int not null default 0,
  failed_cases int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists test_cases (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references test_runs(id) on delete cascade,
  sample_id text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'passed', 'failed', 'error')),
  input_message text,
  expected_category text,
  expected_urgency text,
  actual_category text,
  actual_urgency text,
  expected_output jsonb,
  actual_output jsonb,
  category_match boolean,
  urgency_match boolean,
  execution_time_ms int,
  error_message text,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_test_runs_landlord on test_runs(landlord_id);
create index idx_test_runs_component on test_runs(component_name);
create index idx_test_runs_created on test_runs(created_at desc);
create index idx_test_cases_run on test_cases(run_id);

-- RLS
alter table test_runs enable row level security;
alter table test_cases enable row level security;

create policy "test_runs_all" on test_runs for all using (true) with check (true);
create policy "test_cases_all" on test_cases for all using (true) with check (true);
