-- Extend properties table
alter table properties
  add column apt_or_unit_no text,
  add column rent_due_day int not null default 1;

alter table properties
  add constraint chk_rent_due_day check (rent_due_day >= 1 and rent_due_day <= 28);

-- Extend tenants table
alter table tenants
  add column move_in_date date,
  add column lease_type text,
  add column lease_start_date date,
  add column lease_end_date date,
  add column rent_due_day int,
  add column custom_fields jsonb default '{}';

alter table tenants
  add constraint tenants_rent_due_day_check
  check (rent_due_day is null or (rent_due_day >= 1 and rent_due_day <= 28));

alter table tenants
  add constraint tenants_lease_type_check
  check (lease_type is null or lease_type in ('yearly', 'month_to_month'));

-- Extend vendors table
alter table vendors
  add column custom_fields jsonb default '{}';

-- Create rent_payments table
create table rent_payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  tenant_id uuid references tenants,
  amount decimal(10,2) not null,
  paid_at timestamptz not null,
  period_start date not null,
  period_end date not null,
  notes text,
  created_at timestamptz default now()
);

create index idx_rent_payments_property on rent_payments(property_id);
create index idx_rent_payments_paid_at on rent_payments(property_id, paid_at desc);

-- Create documents table + storage bucket
create table documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  tenant_id uuid references tenants,
  landlord_id text not null,
  document_type text not null,
  storage_path text not null,
  file_name text not null,
  file_type text not null,
  file_size int not null,
  description text,
  uploaded_at timestamptz default now()
);

create index idx_documents_property_id on documents(property_id);
create index idx_documents_property_type on documents(property_id, document_type);
create index idx_documents_tenant_id on documents(tenant_id);

alter table documents
  add constraint documents_type_check
  check (document_type in ('lease', 'receipt', 'inspection_move_in', 'inspection_move_out', 'property_photo', 'other'));

insert into storage.buckets (id, name, public)
values ('property-documents', 'property-documents', false);

-- Create property_utilities table
create table property_utilities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  utility_type text not null,
  provider_name text,
  provider_phone text,
  provider_website text,
  account_number text,
  confirmation_status text not null default 'ai_suggested',
  ai_confidence text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(property_id, utility_type)
);

create index idx_property_utilities_property on property_utilities(property_id);

create trigger set_updated_at_property_utilities
  before update on property_utilities
  for each row execute function update_updated_at();
