-- Add cooldown_until to autonomy_settings
-- When a landlord overrides a decision, autonomy is cooled down for 24h
alter table autonomy_settings
  add column if not exists cooldown_until timestamptz;

-- autonomy_feedback: records landlord overrides for AI learning
create table autonomy_feedback (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references autonomous_decisions(id) on delete cascade,
  landlord_id text not null,
  feedback_type text not null default 'override'
    check (feedback_type in ('override')),
  reason_text text,
  created_at timestamptz default now()
);

create index idx_autonomy_feedback_decision_id on autonomy_feedback(decision_id);
create index idx_autonomy_feedback_landlord_id on autonomy_feedback(landlord_id);

-- Enable RLS
alter table autonomy_feedback enable row level security;

create policy autonomy_feedback_select_authenticated on autonomy_feedback
  for select using (auth.role() = 'authenticated');

create policy autonomy_feedback_insert_authenticated on autonomy_feedback
  for insert with check (auth.role() = 'authenticated');
