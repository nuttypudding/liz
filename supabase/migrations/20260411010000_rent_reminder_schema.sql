-- rent_periods: lease periods and rent schedules for each property/tenant relationship
create table rent_periods (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  lease_start date not null,
  lease_end date,
  monthly_rent numeric not null,
  rent_due_day integer not null check (rent_due_day >= 1 and rent_due_day <= 28),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(property_id, tenant_id)
);

create index idx_rent_periods_property_id on rent_periods(property_id);
create index idx_rent_periods_tenant_id on rent_periods(tenant_id);
create index idx_rent_periods_lease_start on rent_periods(lease_start);

-- Create trigger to update updated_at
create trigger set_updated_at_rent_periods
  before update on rent_periods
  for each row execute function update_updated_at();

-- notifications: track rent-related notifications sent to landlords
create table notifications (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,
  property_id uuid not null references properties(id) on delete cascade,
  tenant_id uuid references auth.users(id) on delete set null,
  notification_type text not null check (notification_type in ('rent_due_reminder', 'rent_overdue', 'rent_paid')),
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz default now(),
  foreign key (landlord_id) references landlord_profiles(landlord_id) on delete cascade
);

create index idx_notifications_landlord_id on notifications(landlord_id);
create index idx_notifications_property_id on notifications(property_id);
create index idx_notifications_sent_at on notifications(sent_at);
create index idx_notifications_read_at on notifications(read_at);

-- Enable RLS on rent reminder tables
alter table rent_periods enable row level security;
alter table notifications enable row level security;

-- RLS Policies: require authenticated user
create policy rent_periods_authenticated on rent_periods
  for select using (auth.role() = 'authenticated');

create policy rent_periods_insert_authenticated on rent_periods
  for insert with check (auth.role() = 'authenticated');

create policy rent_periods_update_authenticated on rent_periods
  for update using (auth.role() = 'authenticated');

create policy notifications_authenticated on notifications
  for select using (auth.role() = 'authenticated');

create policy notifications_insert_authenticated on notifications
  for insert with check (auth.role() = 'authenticated');

create policy notifications_update_authenticated on notifications
  for update using (auth.role() = 'authenticated');

-- Add notification preference columns to landlord_profiles
alter table landlord_profiles
  add column if not exists notify_rent_reminders boolean not null default true,
  add column if not exists notify_rent_overdue_summary boolean not null default true;
