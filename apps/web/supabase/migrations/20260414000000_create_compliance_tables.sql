-- Create jurisdiction_rules table
create table public.jurisdiction_rules (
  id uuid primary key default gen_random_uuid(),
  state_code varchar(2) not null, -- e.g., "CA", "NY", "TX"
  city varchar(255), -- specific city or NULL for statewide rules
  topic varchar(100) not null, -- e.g., "notice_period_entry", "security_deposit_limit", "habitability_requirement"
  rule_text text not null, -- full text of the rule
  statute_citation varchar(255) not null, -- e.g., "CA Civil Code § 1950.7"
  last_verified_at timestamp with time zone not null, -- when rule was last checked for accuracy
  details jsonb, -- flexible JSON for rule-specific data (min/max amounts, duration in days, exemptions, etc.)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index jurisdiction_rules_state_city_topic_idx on public.jurisdiction_rules(state_code, city, topic);
create index jurisdiction_rules_state_code_idx on public.jurisdiction_rules(state_code);
create index jurisdiction_rules_topic_idx on public.jurisdiction_rules(topic);

-- Create property_jurisdictions table
create table public.property_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  state_code varchar(2) not null,
  city varchar(255) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint property_jurisdictions_property_id_unique unique (property_id)
);

create index property_jurisdictions_property_id_idx on public.property_jurisdictions(property_id);
create index property_jurisdictions_state_city_idx on public.property_jurisdictions(state_code, city);

-- Create compliance_notices table
create table public.compliance_notices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  landlord_id uuid not null references public.landlord_profiles(id) on delete cascade,
  type varchar(50) not null, -- e.g., "entry", "lease_violation", "rent_increase", "eviction"
  status varchar(50) not null, -- e.g., "draft", "generated", "sent", "acknowledged"
  content text not null, -- the full notice text
  jurisdiction_data jsonb, -- snapshot of jurisdiction rules used to generate notice
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  sent_at timestamp with time zone
);

create index compliance_notices_property_id_idx on public.compliance_notices(property_id);
create index compliance_notices_landlord_id_idx on public.compliance_notices(landlord_id);
create index compliance_notices_status_idx on public.compliance_notices(status);
create index compliance_notices_created_at_idx on public.compliance_notices(created_at desc);

-- Create compliance_audit_log table
create table public.compliance_audit_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  landlord_id uuid not null references public.landlord_profiles(id) on delete cascade,
  action_type varchar(100) not null, -- e.g., "rule_reviewed", "notice_generated", "notice_sent", "checklist_item_completed"
  details jsonb, -- action-specific context
  timestamp timestamp with time zone default now()
);

create index compliance_audit_log_property_id_idx on public.compliance_audit_log(property_id);
create index compliance_audit_log_landlord_id_idx on public.compliance_audit_log(landlord_id);
create index compliance_audit_log_action_type_idx on public.compliance_audit_log(action_type);
create index compliance_audit_log_timestamp_idx on public.compliance_audit_log(timestamp desc);

-- Create compliance_checklist_items table
create table public.compliance_checklist_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  topic varchar(100) not null, -- corresponds to jurisdiction_rules.topic
  description text not null, -- human-readable description of the checklist item
  completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index compliance_checklist_items_property_id_idx on public.compliance_checklist_items(property_id);
create index compliance_checklist_items_completed_idx on public.compliance_checklist_items(completed);
create index compliance_checklist_items_topic_idx on public.compliance_checklist_items(topic);

-- Enable RLS on compliance_notices
alter table public.compliance_notices enable row level security;

create policy "Landlords can view compliance notices for their properties"
  on public.compliance_notices for select
  using (
    landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
  );

create policy "Landlords can update compliance notices for their properties"
  on public.compliance_notices for update
  using (
    landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
  )
  with check (
    landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
  );

create policy "Landlords can insert compliance notices for their properties"
  on public.compliance_notices for insert
  with check (
    landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
  );

-- Enable RLS on compliance_audit_log
alter table public.compliance_audit_log enable row level security;

create policy "Landlords can view compliance audit logs for their properties"
  on public.compliance_audit_log for select
  using (
    landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
  );

-- Enable RLS on compliance_checklist_items
alter table public.compliance_checklist_items enable row level security;

create policy "Landlords can view compliance checklist items for their properties"
  on public.compliance_checklist_items for select
  using (
    property_id in (
      select id from public.properties
      where landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
    )
  );

create policy "Landlords can update compliance checklist items for their properties"
  on public.compliance_checklist_items for update
  using (
    property_id in (
      select id from public.properties
      where landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
    )
  )
  with check (
    property_id in (
      select id from public.properties
      where landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
    )
  );

create policy "Landlords can insert compliance checklist items for their properties"
  on public.compliance_checklist_items for insert
  with check (
    property_id in (
      select id from public.properties
      where landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
    )
  );

-- Enable RLS on property_jurisdictions
alter table public.property_jurisdictions enable row level security;

create policy "Landlords can view property jurisdictions for their properties"
  on public.property_jurisdictions for select
  using (
    property_id in (
      select id from public.properties
      where landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
    )
  );

create policy "Landlords can update property jurisdictions for their properties"
  on public.property_jurisdictions for update
  using (
    property_id in (
      select id from public.properties
      where landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
    )
  )
  with check (
    property_id in (
      select id from public.properties
      where landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
    )
  );

create policy "Landlords can insert property jurisdictions for their properties"
  on public.property_jurisdictions for insert
  with check (
    property_id in (
      select id from public.properties
      where landlord_id = (select id from public.landlord_profiles where user_id = auth.uid())
    )
  );
