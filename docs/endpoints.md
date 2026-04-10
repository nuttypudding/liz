# Endpoints

> **Keep this file up to date.** When adding new API routes, changing Supabase config, updating Vercel deployments, or modifying environment URLs, update the relevant section below.

## Environments

### Local Development

| Service | URL |
|---------|-----|
| Next.js App | `http://192.168.50.249:3000` |
| Supabase API | `http://localhost:54321` |
| Supabase Studio | `http://localhost:54323` |
| Supabase Postgres | `localhost:54322` |
| Supabase Storage | `http://localhost:54321/storage/v1` |
| Supabase Auth | `http://localhost:54321/auth/v1` |
| Ngrok Tunnel (webhooks) | `https://unvenomed-finned-yulanda.ngrok-free.dev` |

### QA (Supabase Cloud)

| Service | URL |
|---------|-----|
| Supabase API | `https://kmtqmuedhwfcosbgsstu.supabase.co` |
| Supabase Studio | `https://supabase.com/dashboard/project/kmtqmuedhwfcosbgsstu` |

### Production

| Service | URL |
|---------|-----|
| Vercel (Frontend) | `https://web-lovat-sigma-36.vercel.app` |
| Vercel Project | `prj_DnDSbfQ2y0gh4EAG06PPbfKQsCiB` |
| Supabase API | _Not yet configured — using QA for now_ |

## Auth (Clerk)

| Resource | URL / Value |
|----------|-------------|
| Sign In | `/sign-in` |
| Sign Up | `/sign-up` |
| Role Select | `/role-select` |
| Set Role API | `POST /api/auth/set-role` |
| Clerk Dashboard | `https://dashboard.clerk.com` |
| Webhook endpoint | `/api/webhook/clerk` |

## API Routes (Next.js)

All routes are relative to the app root (e.g. `http://192.168.50.249:3000` locally).

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/settings/profile` | Fetch landlord profile |
| PUT | `/api/settings/profile` | Update landlord profile / complete onboarding |
| GET | `/api/properties` | List landlord's properties (with tenants, apt_or_unit_no, rent_due_day) |
| POST | `/api/properties` | Create a property (accepts apt_or_unit_no, rent_due_day) |
| GET | `/api/properties/[id]` | Get single property |
| PUT | `/api/properties/[id]` | Update a property |
| DELETE | `/api/properties/[id]` | Delete a property |
| POST | `/api/properties/[id]/tenants` | Add tenant to property (accepts lease fields + custom_fields) |
| GET | `/api/properties/[id]/rent-status` | Rent status for a property (overdue, last paid) |
| POST | `/api/properties/[id]/rent-payments` | Record a rent payment for a property |
| GET | `/api/properties/[id]/documents` | List documents for a property (landlord or tenant) |
| DELETE | `/api/documents/[id]` | Delete a document |
| GET | `/api/documents/[id]/url` | Get signed download URL for a document |
| POST | `/api/documents/upload` | Upload document to property-documents bucket |
| GET | `/api/properties/[id]/utilities` | List utility info for a property (landlord or tenant; tenant view omits account numbers and N/A rows) |
| PUT | `/api/properties/[id]/utilities` | Upsert utility info for a property (landlord only; bulk upsert all utility types) |
| POST | `/api/properties/[id]/utilities/suggest` | AI-suggest utility providers for a property |
| GET | `/api/tenants/[id]` | Get single tenant |
| PUT | `/api/tenants/[id]` | Update a tenant |
| PATCH | `/api/tenants/[id]` | Partially update a tenant (accepts lease fields + custom_fields) |
| DELETE | `/api/tenants/[id]` | Delete a tenant |
| GET | `/api/vendors` | List vendors (sorted by preferred/priority) |
| POST | `/api/vendors` | Create a vendor (accepts priority_rank + custom_fields) |
| GET | `/api/vendors/[id]` | Get single vendor |
| PUT | `/api/vendors/[id]` | Update a vendor (accepts priority_rank + custom_fields) |
| PATCH | `/api/vendors/[id]` | Partially update a vendor (accepts priority_rank + custom_fields) |
| DELETE | `/api/vendors/[id]` | Delete a vendor |
| GET | `/api/dashboard/stats` | Get dashboard statistics (supports optional ?propertyId= filter) |
| GET | `/api/dashboard/spend-chart` | Get spend chart data (supports optional ?propertyId= filter) |
| GET | `/api/requests` | List maintenance requests (supports optional ?propertyId= filter) |
| POST | `/api/classify` | AI classification of maintenance request |
| POST | `/api/intake` | Submit maintenance intake |
| GET | `/api/requests/[id]` | Get single maintenance request |
| PATCH | `/api/requests/[id]` | Update a maintenance request |
| POST | `/api/requests/[id]/dispatch` | Dispatch request to vendor |
| POST | `/api/requests/[id]/resolve` | Resolve a maintenance request |
| POST | `/api/requests/[id]/work-order` | Create work order for a request |
| GET | `/api/vendors/[id]/availability` | Get vendor availability rules (landlord) |
| PUT | `/api/vendors/[id]/availability` | Set vendor availability rules (landlord) |
| POST | `/api/scheduling/tenant-availability` | Submit tenant available slots (any auth; task must be `awaiting_tenant`) |
| GET | `/api/scheduling/suggest/[taskId]` | Get AI-ranked slot suggestions for a scheduling task (landlord) |
| POST | `/api/scheduling/confirm` | Confirm a time slot; 409 on double-booking (landlord) |
| POST | `/api/scheduling/reschedule/[taskId]` | Request reschedule — moves task to `rescheduling`, notifies landlord (any auth) |
| GET | `/api/scheduling/tasks` | Fetch scheduling task by `?requestId=<uuid>` (landlord) |
| POST | `/api/scheduling/tasks` | Create a new scheduling task (landlord; called from dispatch) |
| GET | `/api/scheduling/tasks/[taskId]` | Fetch a single scheduling task by ID (landlord) |
| GET | `/api/reschedule/verify-token/[token]` | Validate reschedule token and fetch task details (public, token-based) |
| GET | `/api/tenant/me` | Get current tenant's profile |
| POST | `/api/upload` | General file upload |
| POST | `/api/auth/set-role` | Set user role (landlord/tenant) after signup |
| GET | `/api/billing` | Billing plan info and usage counts (landlord) |
| POST | `/api/webhook/clerk` | Clerk webhook for user sync |
| GET | `/api/rules` | List landlord's automation rules (sorted by priority) |
| POST | `/api/rules` | Create a new automation rule (max 25 per landlord) |
| GET | `/api/rules/[id]` | Get single automation rule |
| PUT | `/api/rules/[id]` | Update an automation rule |
| DELETE | `/api/rules/[id]` | Delete an automation rule (204 No Content) |
| PATCH | `/api/rules/[id]/reorder` | Reorder rule by priority (shifts other rules) |
| POST | `/api/rules/[id]/test` | Test rule against sample data (returns condition breakdown + actions preview) |
| GET | `/api/rules/logs` | Query rule execution logs (filters: request_id, rule_id, from_date, to_date, matched_only; paginates by limit/offset) |
| GET | `/api/rules/summary` | Fetch rules summary (active_rules, auto_approved_this_month, total_processed_this_month) |

## App Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing / home page |
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |
| `/role-select` | Post-signup role selection (landlord or tenant) |
| `/unauthorized` | Access denied page (role mismatch) |
| `/onboarding` | 5-step onboarding wizard |
| `/dashboard` | Main landlord dashboard |
| `/properties` | Properties list |
| `/requests` | Maintenance requests list (landlord) |
| `/requests/[id]` | Request detail / triage (landlord) |
| `/vendors` | Vendors list |
| `/settings` | Landlord settings / AI preferences |
| `/billing` | Landlord billing — current plan, usage, available plans |
| `/submit` | Tenant maintenance request submission |
| `/my-requests` | Tenant's submitted requests |
| `/my-requests/[id]` | Tenant request detail |
| `/scheduling/availability-prompt/[taskId]` | Tenant availability submission for scheduling (public, token-based) |
| `/reschedule/[token]` | Vendor reschedule request page (public, token-based) |

## Environment Files

| File | Environment | Notes |
|------|-------------|-------|
| `apps/web/.env.local` | Local dev | Supabase Docker + Clerk test keys |
| `apps/web/.env.qa` | QA | Supabase cloud + Clerk test keys |
| `apps/web/.env.example` | Template | Placeholder values for new devs |
| `.env` / `.env.local` | Root (Arena) | LLM API keys, root-level Clerk keys |
