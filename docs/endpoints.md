# Endpoints

## Quick Start

```bash
# Main app (port 3000)
npm run dev:web

# Test Lab (port 3100, LAN-accessible)
npm run dev:test-lab

# Both at once
npm run dev:web & npm run dev:test-lab
```

| App | Local | LAN |
|-----|-------|-----|
| Web | http://localhost:3000 | http://192.168.50.249:3000 |
| Test Lab | http://localhost:3100 | http://192.168.50.249:3100 |

---

> **Keep this file up to date.** When adding new API routes, changing Supabase config, updating Vercel deployments, or modifying environment URLs, update the relevant section below.

## Environments

### Local Development

| Service | URL |
|---------|-----|
| Next.js App (web) | `http://192.168.50.249:3000` |
| Test Lab App | `http://localhost:3100` |
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
| GET | `/api/payments` | List payments (tenant sees own, landlord sees property-scoped; ?tenant_id, ?property_id, ?status, ?limit, ?offset) |
| GET | `/api/payments/[id]` | Get single payment with receipt data |
| POST | `/api/payments/checkout` | Create Stripe checkout session for a payment period |
| POST | `/api/payments/generate` | Generate current month's payment period for tenant (creates if missing) |
| GET | `/api/payments/connect/onboard` | Stripe Connect onboarding for landlord |
| GET | `/api/payments/connect/status` | Stripe Connect account status |
| POST | `/api/payments/vendor` | Create vendor payment record |
| GET | `/api/payments/vendor` | List vendor payments |
| GET | `/api/payments/summary` | Financial summary (monthly P&L aggregation) |
| GET | `/api/autonomy/settings` | Fetch autonomy settings (creates defaults if none) |
| PUT | `/api/autonomy/settings` | Update autonomy settings (partial update) |
| GET | `/api/autonomy/decisions` | List autonomous decisions (filters: ?status, ?sort, ?limit, ?offset) |
| POST | `/api/autonomy/decisions` | Create autonomous decision record |
| PATCH | `/api/autonomy/decisions/[id]` | Review decision (confirm or override with notes) |
| GET | `/api/autonomy/stats` | Monthly autonomy stats (optional ?month=YYYY-MM) |
| POST | `/api/applications` | Submit rental application (public, no auth) |
| GET | `/api/applications` | List applications for landlord's properties (landlord; ?property_id, ?status, ?sort, ?order, ?page, ?limit) |
| GET | `/api/applications/[id]` | Get full application detail with screening report and computed metrics (landlord) |
| POST | `/api/applications/[id]/decide` | Make approval/denial decision on an application (landlord; requires denial_reason + compliance_confirmed for deny) |
| GET | `/api/applications/status/[trackingId]` | Public status check by tracking ID — returns status timeline and generic message (no auth, no AI details) |
| GET | `/api/properties/[id]/jurisdiction` | Get jurisdiction for a property (state_code, city); returns null fields if not set, plus auto-detect suggestion from property address |
| POST | `/api/properties/[id]/jurisdiction` | Set/update jurisdiction for a property (`{ state_code, city? }`); validates state code and city against jurisdiction_rules; logs audit event |
| GET | `/api/compliance/[propertyId]/score` | Compliance score for a property — returns 0–100 score, completed_count, total_required_count, and missing_items list; requires jurisdiction to be set (400 if not configured) |
| GET | `/api/compliance/[propertyId]/checklist` | Fetch all compliance checklist items for a property with completion status; optional `?completed=true\|false` filter |
| PATCH | `/api/compliance/[propertyId]/checklist/[itemId]` | Mark a checklist item complete or incomplete (`{ completed: boolean }`); sets/clears completed_at, logs to compliance_audit_log |
| POST | `/api/compliance/review` | AI review of landlord message for fair housing, notice language, and disclosure issues; returns findings with severity, type, flagged_text, reason, suggestion, escalation_required, escalation_reason, prompt_version (v1.0); logs to compliance_audit_log (`{ message_text, property_id, recipient_type? }`) |
| POST | `/api/compliance/notices/generate` | AI-generated jurisdiction-specific legal notice; supports notice_type: entry, lease_violation, rent_increase, eviction; returns notice content, statutory_citations, notice_period_days, prompt_version (v1.0); stores in compliance_notices; logs to compliance_audit_log (`{ property_id, notice_type, context: { tenant_name, issue_description, proposed_date?, rent_increase_amount?, effective_date?, additional_details? } }`) |
| POST | `/api/compliance/notices/[id]/send` | Send a generated notice — updates status to "sent", records sent_at and delivery_method, logs notice_sent to compliance_audit_log; prevents resending already-sent notices (400); body: `{ delivery_method?: "email\|print\|other", notes?: string }` |
| GET | `/api/compliance/[propertyId]/audit-log` | Paginated compliance audit trail for a property — returns entries with action_type, details, timestamp, actor_id; query params: `?action_type=`, `?limit=` (max 100), `?offset=`, `?start_date=`, `?end_date=` |
| GET | `/api/compliance/knowledge` | Queryable jurisdiction rules knowledge base — returns rules grouped by jurisdiction; query params: `?state_code=CA`, `?city=San Francisco` (requires state_code), `?topic=security_deposit_limit`, `?search=deposit` (searches rule_text + statute_citation), `?limit=50` (max 100), `?offset=0`; returns `{ jurisdictions, total_count, limit, offset }` |
| GET | `/api/compliance/alerts/[propertyId]` | Proactive compliance alerts for a property — checks property state against jurisdiction rules and returns actionable warnings/errors; alert types: `jurisdiction_not_configured`, `incomplete_checklist`, `missing_security_deposit_disclosure`, `missing_lease_terms`, `habitability_defect_not_addressed`; query params: `?severity=warning\|error\|all` (default "all"), `?since=ISO date` (filter event-based alerts by date); returns `{ property_id, jurisdiction, alert_count, alerts }` |
| GET | `/api/compliance/jurisdictions` | Available jurisdictions from jurisdiction_rules — returns `{ states: string[], cities: Record<string, string[]> }` for populating state/city dropdowns |
| GET | `/api/compliance/stats` | Aggregated compliance stats across all landlord properties — returns `{ average_score, properties_needing_attention, critical_alerts_count, total_properties, score_distribution }` where score_distribution has keys: excellent, good, fair, poor, critical; used by ComplianceSummaryCard dashboard widget |
| GET | `/api/rent` | List rent periods for landlord (filterable by property_id, status, month) |
| PATCH | `/api/rent/[id]` | Update rent period — mark as paid/partial/overdue; accepts `{ status, amount_paid, paid_at }` |
| POST | `/api/rent/generate` | Generate rent periods for a month (`{ month: "YYYY-MM" }`) — idempotent |
| GET | `/api/tenant/rent` | List rent periods for the authenticated tenant (newest first) |
| GET | `/api/dashboard/rent-summary` | Aggregated rent stats — collected, overdue, due counts and amounts for current month |
| GET | `/api/notifications` | List notifications for the authenticated user (`?limit`, `?offset`, `?unread_only`) |
| PATCH | `/api/notifications` | Mark notifications as read (`{ ids: string[] }` or `{ all: true }`) |
| POST | `/api/cron/rent-reminders` | Daily cron (6:00 AM UTC) — transitions rent period statuses and creates in-app notifications |

## App Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing / home page |
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |
| `/role-select` | Post-signup role selection (landlord or tenant) |
| `/unauthorized` | Access denied page (role mismatch) |
| `/onboarding` | 5-step onboarding wizard |
| `/dashboard` | Main landlord dashboard (includes compliance alert banners — top 3 most severe across all properties) |
| `/properties` | Properties list |
| `/requests` | Maintenance requests list (landlord; habitability badge shown on cards for plumbing/electrical/hvac/structural categories) |
| `/requests/[id]` | Request detail / triage (landlord; shows compliance alert banners for habitability/critical issues; entry notice suggestion appears in scheduling modal when a time slot is selected) |
| `/vendors` | Vendors list |
| `/settings` | Landlord settings / AI preferences (supports `?tab=preferences\|notifications\|rules\|autopilot`) |
| `/autopilot` | Autonomy dashboard — status banner, summary metrics, decision feed |
| `/autopilot/report` | Monthly autonomy performance report — charts, metrics, AI recommendations |
| `/applications` | Applications dashboard — filterable list with status/risk badges (landlord) |
| `/applications/[id]` | Application detail — two-column layout with applicant info, screening report, risk factors, decision controls (landlord) |
| `/billing` | Landlord billing — current plan, usage, available plans |
| `/dashboard/payments` | Landlord payment dashboard — rent collection, vendor payments, financial summary |
| `/submit` | Tenant maintenance request submission |
| `/my-requests` | Tenant's submitted requests |
| `/my-requests/[id]` | Tenant request detail |
| `/scheduling/availability-prompt/[taskId]` | Tenant availability submission for scheduling (public, token-based) |
| `/reschedule/[token]` | Vendor reschedule request page (public, token-based) |
| `/pay` | Tenant payment portal — balance card, pay rent, payment history |
| `/apply/[propertyId]` | Public rental application form (no auth) |
| `/apply/status/[trackingId]` | Public application status page — timeline, status message, FAQ (no auth) |
| `/compliance` | Compliance dashboard — all-properties view with scores, alerts, jurisdiction badges |
| `/compliance/[propertyId]` | Property compliance detail — score breakdown, checklist, alerts (using ComplianceAlertsBanner), audit log |
| `/compliance/notices` | Notice generator — redirects to `/compliance/notices/create` |
| `/compliance/notices/create` | Multi-step wizard for creating, previewing, and sending jurisdiction-specific legal notices (5 steps: property, type, details, preview, send) |
| `/compliance/messages/review` | Communication reviewer — compose a message, select a property, and run AI compliance review before sending |
| `/compliance/knowledge-base` | Legal knowledge base — browse and search jurisdiction rules by topic, with category-organized grid and detail modal |
| `/compliance/settings` | Compliance settings — configure jurisdiction (state/city) and lease terms per property, with checklist preview |
| `/rent` | Rent Schedule page (landlord) — rent periods table/card view, mark-paid dialog, filters, overdue banners |
| `/my-rent` | Tenant Rent View — current rent status card and payment history (tenant) |

## Test Lab (`apps/test-lab/` — port 3100)

Standalone QA dashboard for testing AI components in isolation. No auth required.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/` | Test Lab dashboard (Components, Test Runs, Manual Test tabs) |
| GET | `/api/test-lab/runs` | List test runs (filters: `component`, `limit`) |
| POST | `/api/test-lab/runs` | Create empty test run |
| GET | `/api/test-lab/runs/[id]` | Get test run with all test cases |
| POST | `/api/test-lab/components/triage/run` | Run triage classifier against 20 curated samples |
| POST | `/api/test-lab/components/triage/manual` | Classify arbitrary text (no DB persistence) |

## Environment Files

| File | Environment | Notes |
|------|-------------|-------|
| `apps/web/.env.local` | Local dev | Supabase Docker + Clerk test keys |
| `apps/web/.env.qa` | QA | Supabase cloud + Clerk test keys |
| `apps/web/.env.example` | Template | Placeholder values for new devs |
| `apps/test-lab/.env.local` | Local dev | Supabase + Anthropic keys (subset of web) |
| `apps/test-lab/.env.example` | Template | Placeholder values |
| `.env` / `.env.local` | Root (Arena) | LLM API keys, root-level Clerk keys |
