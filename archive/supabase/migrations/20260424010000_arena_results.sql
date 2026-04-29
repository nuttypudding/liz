-- Arena results: store every LLM evaluation for analysis and deduplication

create table if not exists arena_results (
  id uuid primary key default gen_random_uuid(),
  -- Dedup key: hash of (model_id, sample_id, tenant_message)
  input_hash text not null,
  model_id text not null,
  sample_id text not null,
  tenant_message text not null,
  photo_count int not null default 0,

  -- LLM output
  category text,
  urgency text,
  recommended_action text,
  confidence_score real,

  -- Metadata
  execution_time_ms int,
  error text,
  created_at timestamptz not null default now()
);

-- Fast lookup by input_hash for dedup
create unique index idx_arena_results_hash on arena_results(input_hash);
-- Analysis queries
create index idx_arena_results_model on arena_results(model_id);
create index idx_arena_results_sample on arena_results(sample_id);
create index idx_arena_results_created on arena_results(created_at desc);

-- RLS (open for dev tools, no auth)
alter table arena_results enable row level security;
create policy "arena_results_all" on arena_results for all using (true) with check (true);
