---
id: 001
title: Initialize Supabase and create database migrations
tier: Haiku
depends_on: []
feature: ai-maintenance-intake-mvp
---

# 001 — Initialize Supabase and Create Database Migrations

## Objective

Set up the Supabase local dev environment with all database tables and a storage bucket for photo uploads. This is the foundation that all API route wiring depends on.

## Context

- Feature plan: `features/planned/P1-001-ai-maintenance-intake-mvp/README.md` (Data Model section)
- The full SQL schema is defined in the feature plan. No migrations exist yet.
- Project uses Supabase CLI with Docker for local dev: `localhost:54321` (API), `:54322` (DB), `:54323` (Studio)
- Clerk owns auth — Supabase tables use `text` columns for Clerk user IDs, not `uuid references auth.users`
- Web app is at `apps/web/`. Supabase project should be initialized at repo root or `apps/web/`.

## Implementation

### Step 1: Initialize Supabase project

```bash
cd /home/noelcacnio/Documents/repo/liz/apps/web
npx supabase init
```

This creates `supabase/` directory with `config.toml`.

### Step 2: Create the initial migration

```bash
npx supabase migration new create_tables
```

This creates a timestamped file in `supabase/migrations/`. Add the following SQL (from the feature plan):

**Tables to create (in order for FK references):**

1. `properties` — landlord properties (`landlord_id text not null` = Clerk user ID)
2. `vendors` — landlord vendor contacts (`landlord_id text not null` = Clerk user ID)
3. `tenants` — tenants linked to properties (FK → properties)
4. `maintenance_requests` — core table (FK → properties, tenants, vendors)
5. `request_photos` — photos attached to requests (FK → maintenance_requests)

Use the exact schema from the feature plan `Data Model [TODO]` section. Key details:
- All primary keys: `uuid default gen_random_uuid()`
- `maintenance_requests.vendor_id` references `vendors` — so `vendors` must be created before `maintenance_requests`
- Add `updated_at` trigger for `maintenance_requests`

### Step 3: Create storage bucket migration

```bash
npx supabase migration new create_storage_bucket
```

Add SQL to create the `request-photos` storage bucket:

```sql
insert into storage.buckets (id, name, public)
values ('request-photos', 'request-photos', false);
```

### Step 4: Add indexes

Create a migration for performance indexes:

```sql
create index idx_properties_landlord on properties(landlord_id);
create index idx_tenants_property on tenants(property_id);
create index idx_tenants_clerk_user on tenants(clerk_user_id);
create index idx_requests_property on maintenance_requests(property_id);
create index idx_requests_status on maintenance_requests(status);
create index idx_requests_urgency on maintenance_requests(ai_urgency);
create index idx_request_photos_request on request_photos(request_id);
create index idx_vendors_landlord on vendors(landlord_id);
```

### Step 5: Start Supabase and verify

```bash
npx supabase start
npx supabase db push
```

Verify tables exist via Studio at `localhost:54323`.

### Step 6: Add updated_at trigger

Create a trigger function for auto-updating `updated_at`:

```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on maintenance_requests
  for each row execute function update_updated_at();
```

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] `supabase/config.toml` exists with correct project config
3. [ ] Migration files create all 5 tables: properties, vendors, tenants, maintenance_requests, request_photos
4. [ ] Foreign key relationships are correct (tenants → properties, requests → properties/tenants/vendors, photos → requests)
5. [ ] `request-photos` storage bucket is created
6. [ ] Performance indexes are created
7. [ ] `updated_at` trigger works on maintenance_requests
8. [ ] `npx supabase start` succeeds and all services are accessible
9. [ ] Tables visible in Supabase Studio at localhost:54323
