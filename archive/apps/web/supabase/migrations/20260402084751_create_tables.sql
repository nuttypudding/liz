-- Properties managed by landlords
create table properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,  -- Clerk user ID
  name text not null,
  address text not null,
  unit_count int not null default 1,
  monthly_rent decimal(10,2),
  created_at timestamptz default now()
);

-- Tenants linked to properties
create table tenants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  clerk_user_id text,  -- Clerk user ID, null if tenant hasn't signed up
  name text not null,
  email text,
  phone text,
  unit_number text,
  created_at timestamptz default now()
);

-- Landlord's preferred vendors
create table vendors (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,  -- Clerk user ID
  name text not null,
  phone text,
  email text,
  specialty text,  -- plumbing, electrical, hvac, general, etc.
  notes text,
  created_at timestamptz default now()
);

-- Maintenance requests (core table)
create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  tenant_id uuid references tenants,
  tenant_message text not null,
  status text not null default 'submitted',
    -- submitted → triaged → approved → dispatched → resolved → closed

  -- AI classification output
  ai_category text,  -- plumbing, electrical, hvac, structural, pest, appliance, general
  ai_urgency text,   -- low, medium, emergency
  ai_recommended_action text,
  ai_cost_estimate_low decimal(10,2),
  ai_cost_estimate_high decimal(10,2),
  ai_confidence_score decimal(3,2),
  ai_troubleshooting_guide text,  -- Gatekeeper: self-help suggestion
  ai_self_resolvable boolean default false,

  -- Landlord actions
  landlord_notes text,
  vendor_id uuid references vendors,
  work_order_text text,
  actual_cost decimal(10,2),

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_at timestamptz
);

-- Photos attached to requests
create table request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references maintenance_requests not null,
  storage_path text not null,  -- Supabase Storage path
  file_type text not null,
  uploaded_at timestamptz default now()
);
