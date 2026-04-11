-- autonomous_decisions: audit trail for all autonomous AI decisions
create table autonomous_decisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references maintenance_requests(id) on delete cascade,
  landlord_id text not null,
  decision_type text not null
    check (decision_type in ('dispatch', 'escalate', 'hold')),
  confidence_score numeric not null
    check (confidence_score >= 0 and confidence_score <= 1),
  reasoning text not null,
  factors jsonb not null default '{}',
  safety_checks jsonb not null default '{}',
  actions_taken jsonb not null default '{}',
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed', 'overridden')),
  reviewed_at timestamptz,
  review_action text
    check (review_action is null or review_action in ('confirmed', 'overridden')),
  review_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_autonomous_decisions_landlord_id on autonomous_decisions(landlord_id);
create index idx_autonomous_decisions_request_id on autonomous_decisions(request_id);
create index idx_autonomous_decisions_status on autonomous_decisions(status);
create index idx_autonomous_decisions_created_at on autonomous_decisions(created_at);

-- Trigger for updated_at
create trigger set_updated_at_autonomous_decisions
  before update on autonomous_decisions
  for each row execute function update_updated_at();

-- Enable RLS
alter table autonomous_decisions enable row level security;

-- RLS Policies: require authenticated user
-- Application layer ensures user is the landlord
create policy autonomous_decisions_select_authenticated on autonomous_decisions
  for select using (auth.role() = 'authenticated');

create policy autonomous_decisions_insert_authenticated on autonomous_decisions
  for insert with check (auth.role() = 'authenticated');

create policy autonomous_decisions_update_authenticated on autonomous_decisions
  for update using (auth.role() = 'authenticated');

create policy autonomous_decisions_delete_authenticated on autonomous_decisions
  for delete using (auth.role() = 'authenticated');
