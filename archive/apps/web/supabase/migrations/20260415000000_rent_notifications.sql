-- P2-001: Add rent notification preferences to landlord_profiles
alter table public.landlord_profiles
  add column if not exists notify_rent_reminders boolean not null default true,
  add column if not exists notify_rent_overdue_summary boolean not null default true;

-- P2-001: Create notifications table for in-app rent notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,
  property_id uuid not null references properties(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  notification_type text not null,
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_landlord_id on notifications(landlord_id);
create index if not exists idx_notifications_read_at on notifications(landlord_id, read_at);
create index if not exists idx_notifications_sent_at on notifications(sent_at);

-- RLS: authenticated users only (app layer handles authorization)
alter table notifications enable row level security;

create policy notifications_select_authenticated on notifications
  for select using (auth.role() = 'authenticated');

create policy notifications_insert_authenticated on notifications
  for insert with check (auth.role() = 'authenticated');

create policy notifications_update_authenticated on notifications
  for update using (auth.role() = 'authenticated');
