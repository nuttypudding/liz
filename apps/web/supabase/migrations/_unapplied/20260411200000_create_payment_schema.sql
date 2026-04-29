-- stripe_accounts: track connected Stripe accounts per property
create table stripe_accounts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  stripe_account_id text not null unique,
  stripe_account_email text,
  charges_enabled boolean default false,
  payouts_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_stripe_accounts_property_id on stripe_accounts(property_id);

-- payment_periods: monthly rent periods for each property/tenant
create table payment_periods (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  year int not null,
  month int not null check (month >= 1 and month <= 12),
  rent_amount numeric not null,
  due_date date,
  status text default 'pending' check (status in ('pending', 'paid', 'late')),
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(property_id, tenant_id, year, month)
);

create index idx_payment_periods_property_id on payment_periods(property_id);
create index idx_payment_periods_tenant_id on payment_periods(tenant_id);
create index idx_payment_periods_status on payment_periods(status);
create index idx_payment_periods_year_month on payment_periods(year, month);

-- payments: individual tenant rent payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  payment_period_id uuid not null references payment_periods(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  amount numeric not null,
  stripe_payment_intent_id text unique,
  stripe_charge_id text unique,
  payment_method text default 'stripe_checkout' check (payment_method in ('stripe_checkout', 'manual')),
  status text default 'pending' check (status in ('completed', 'failed', 'pending')),
  paid_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_payments_payment_period_id on payments(payment_period_id);
create index idx_payments_tenant_id on payments(tenant_id);
create index idx_payments_property_id on payments(property_id);
create index idx_payments_stripe_payment_intent_id on payments(stripe_payment_intent_id);

-- vendor_payments: manual vendor payment logging
create table vendor_payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  vendor_name text not null,
  amount numeric not null,
  payment_date date not null,
  description text,
  request_id uuid references maintenance_requests(id) on delete set null,
  created_at timestamptz default now(),
  created_by uuid not null references auth.users(id) on delete restrict
);

create index idx_vendor_payments_property_id on vendor_payments(property_id);
create index idx_vendor_payments_payment_date on vendor_payments(payment_date);
create index idx_vendor_payments_request_id on vendor_payments(request_id);

-- Enable RLS on all payment tables
alter table stripe_accounts enable row level security;
alter table payment_periods enable row level security;
alter table payments enable row level security;
alter table vendor_payments enable row level security;

-- RLS Policies: require authenticated user
-- Note: Application layer handles specific authorization (landlord vs tenant)
-- These policies ensure data is only accessible to authenticated users

create policy stripe_accounts_authenticated on stripe_accounts
  for select using (auth.role() = 'authenticated');

create policy stripe_accounts_insert_authenticated on stripe_accounts
  for insert with check (auth.role() = 'authenticated');

create policy stripe_accounts_update_authenticated on stripe_accounts
  for update using (auth.role() = 'authenticated');

create policy payment_periods_authenticated on payment_periods
  for select using (auth.role() = 'authenticated');

create policy payment_periods_insert_authenticated on payment_periods
  for insert with check (auth.role() = 'authenticated');

create policy payment_periods_update_authenticated on payment_periods
  for update using (auth.role() = 'authenticated');

create policy payments_authenticated on payments
  for select using (auth.role() = 'authenticated');

create policy payments_insert_authenticated on payments
  for insert with check (auth.role() = 'authenticated');

create policy payments_update_authenticated on payments
  for update using (auth.role() = 'authenticated');

create policy vendor_payments_authenticated on vendor_payments
  for select using (auth.role() = 'authenticated');

create policy vendor_payments_insert_authenticated on vendor_payments
  for insert with check (auth.role() = 'authenticated');

create policy vendor_payments_update_authenticated on vendor_payments
  for update using (auth.role() = 'authenticated');
