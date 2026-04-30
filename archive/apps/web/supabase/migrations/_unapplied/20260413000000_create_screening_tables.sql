-- Create applications table
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  landlord_id uuid not null references public.landlord_profiles(id) on delete cascade,

  -- Applicant personal information
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  date_of_birth date,

  -- Employment information
  employment_status text not null, -- 'employed', 'self-employed', 'retired', 'student', 'other'
  employer_name text,
  job_title text,
  employment_duration_months integer,
  annual_income numeric(12, 2),

  -- Financial information
  monthly_rent_applying_for numeric(10, 2) not null,

  -- References (JSONB array of {name, phone, relationship, contact_method})
  references jsonb default '[]'::jsonb,

  -- Rental history
  has_eviction_history boolean default false,
  eviction_details text,

  -- Application tracking
  status text not null default 'submitted', -- 'submitted', 'screening', 'screened', 'approved', 'denied', 'withdrawn'
  risk_score integer, -- 1-100, null until screening complete
  tracking_id text unique not null,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint income_ratio_check check (annual_income >= 0 and monthly_rent_applying_for >= 0)
);

create index applications_property_id_idx on public.applications(property_id);
create index applications_landlord_id_idx on public.applications(landlord_id);
create index applications_tracking_id_idx on public.applications(tracking_id);
create index applications_status_idx on public.applications(status);
create index applications_created_at_idx on public.applications(created_at desc);

-- Create screening_reports table
create table public.screening_reports (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,

  -- Provider information
  provider text not null, -- 'smartmove', 'checkr', etc.
  external_order_id text, -- ID from third-party provider
  status text not null default 'pending', -- 'pending', 'completed', 'failed'

  -- Credit check results (range returned by provider)
  credit_score_range text, -- '600-650', 'no-hit', etc.

  -- Background check results (JSONB from provider)
  background_result jsonb,

  -- AI analysis (JSONB with recommendation, risk factors, etc.)
  ai_analysis jsonb,

  -- Risk scoring
  risk_score integer, -- 1-100, computed from AI analysis
  recommendation text, -- 'strong_approve', 'approve', 'conditional', 'deny'

  -- Audit
  prompt_snapshot jsonb, -- Sanitized prompt sent to Claude (for compliance verification)

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

create index screening_reports_application_id_idx on public.screening_reports(application_id);
create index screening_reports_provider_idx on public.screening_reports(provider);
create index screening_reports_status_idx on public.screening_reports(status);
create index screening_reports_created_at_idx on public.screening_reports(created_at desc);

-- Create screening_audit_log table
create table public.screening_audit_log (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,

  -- Action tracking
  action text not null, -- 'view', 'screen', 'decide', 'export', etc.
  actor_id uuid, -- user_id of person taking action (null = system)

  -- Details and reason
  details jsonb, -- action-specific data (e.g., decision reason, export params)

  timestamp timestamp with time zone default now()
);

create index screening_audit_log_application_id_idx on public.screening_audit_log(application_id);
create index screening_audit_log_actor_id_idx on public.screening_audit_log(actor_id);
create index screening_audit_log_timestamp_idx on public.screening_audit_log(timestamp desc);

-- Enable RLS on applications
alter table public.applications enable row level security;

create policy "Landlords can view applications for their properties"
  on public.applications for select
  using (
    landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
  );

create policy "Public can create applications (no auth)"
  on public.applications for insert
  with check (true);

create policy "Landlords can update their own application statuses"
  on public.applications for update
  using (
    landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
  )
  with check (
    landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
  );

-- Enable RLS on screening_reports
alter table public.screening_reports enable row level security;

create policy "Landlords can view screening reports for their applications"
  on public.screening_reports for select
  using (
    application_id in (
      select id from public.applications
      where landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
    )
  );

-- Enable RLS on screening_audit_log
alter table public.screening_audit_log enable row level security;

create policy "Landlords can view audit logs for their applications"
  on public.screening_audit_log for select
  using (
    application_id in (
      select id from public.applications
      where landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
    )
  );
