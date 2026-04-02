# Feature: AI Maintenance Intake MVP

**ID**: P1-001
**Ticket**: T-001
**Phase**: 1 — MVP

## Implementation Progress

> **Legend**: `[DONE]` = built and compiling, skip when generating tasks. `[TODO]` = needs work, generate tasks for these.

| Area | Status | Notes |
|------|--------|-------|
| Next.js project + deps | [DONE] | `apps/web/`, all packages installed |
| shadcn/ui components (25) | [DONE] | Installed and working |
| Layouts (root, auth, tenant, landlord) | [DONE] | Route groups, nav, middleware |
| All pages (12 routes) | [DONE] | Built with mock data |
| All custom components (22) | [DONE] | Built with mock data |
| API route stubs (14 endpoints) | [DONE] | Return mock/placeholder responses |
| Lib utilities | [DONE] | validations, clerk helpers, supabase clients, mock-data |
| Middleware (role-based routing) | [DONE] | Clerk middleware, tenant/landlord redirects |
| Supabase database setup | [TODO] | Schema defined below, no migrations created |
| Supabase Storage bucket | [TODO] | `request-photos` bucket not created |
| Wire API routes to Supabase | [TODO] | All 14 routes need real DB queries |
| Claude API integration | [TODO] | `/api/classify` returns mock data |
| Clerk dev keys + role config | [TODO] | No `.env.local`, no role metadata setup |
| Clerk webhook (user sync) | [TODO] | Not implemented |
| Vercel deployment | [TODO] | Not configured |
| Tests | [TODO] | None written |

## TL;DR

Mobile-first web app where tenants submit maintenance requests (text + photos), AI classifies urgency and category, estimates repair cost, and landlords approve vendor dispatch with one click. The "Core Four" — Gatekeeper, Estimator, Matchmaker, Ledger.

## Summary

This is the full MVP for Liz (internally "PAM" — Proprietary AI Asset Manager). It takes a tenant's maintenance complaint from submission to vendor dispatch in under 4 minutes, replacing the current 4-hour manual process. The app serves two personas: tenants who submit issues and landlords who review/approve actions.

The North Star Metric is: **Time from Tenant Complaint to Vendor Dispatched.**

## User Stories

### Tenant
- As a tenant, I want to describe my maintenance issue and upload photos so my landlord is notified immediately.
- As a tenant, I want to receive an automated troubleshooting guide before my request is created so I can resolve simple issues myself.
- As a tenant, I want to see the status of my request (received → scheduled → resolved) so I'm not left in the dark.

### Landlord
- As a landlord, I want to see all maintenance requests classified by urgency (emergency / medium / low) so I know what to handle first.
- As a landlord, I want AI-generated cost estimates for each issue so I have a price anchor before calling vendors.
- As a landlord, I want a one-click "Approve & Send" button that dispatches a work order to my preferred vendor.
- As a landlord, I want to manage my properties and tenants in one place.
- As a landlord, I want a dashboard showing maintenance spend vs. monthly rent so I can track ROI.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (Production)               │
│  ┌───────────────────────────────────────────────┐  │
│  │            Next.js App (App Router)            │  │
│  │                                                │  │
│  │  Pages:                    API Routes:         │  │
│  │  /                         /api/intake         │  │
│  │  /submit                   /api/classify       │  │
│  │  /dashboard                /api/vendors        │  │
│  │  /requests/[id]            /api/dispatch       │  │
│  │  /properties               /api/properties     │  │
│  │  /sign-in, /sign-up (Clerk)                    │  │
│  └──────┬────────────┬───────────────┬───────────┘  │
│         │            │               │               │
│  ┌──────▼─────┐ ┌────▼──────┐ ┌─────▼────────┐     │
│  │  Supabase  │ │ Claude API│ │    Clerk     │     │
│  │  - Postgres│ │ - Sonnet  │ │ - Auth       │     │
│  │  - Storage │ │ - Vision  │ │ - Roles      │     │
│  │  - Realtime│ │           │ │ - Billing    │     │
│  └────────────┘ └───────────┘ └──────────────┘     │
└─────────────────────────────────────────────────────┘

Local Dev:
  Next.js → localhost:3000
  Supabase (Docker) → localhost:54321 (API), :54322 (DB), :54323 (Studio)
  Clerk → cloud (no local instance, uses dev keys)
```

### Request Flow

```
Tenant submits form (text + photos)
    │
    ▼
Gatekeeper: AI checks if self-resolvable
    │
    ├── YES → Send troubleshooting guide, close
    │
    ▼ NO
Estimator: Vision AI analyzes photos + text
    │ → Category (plumbing, electrical, hvac, etc.)
    │ → Urgency (low, medium, emergency)
    │ → Cost estimate range
    │ → Recommended action
    │
    ▼
Landlord Dashboard: Request appears with AI analysis
    │
    ▼
Matchmaker: Landlord picks vendor → AI drafts work order
    │
    ▼
Approve & Send: One-click dispatch (future: SMS/email to vendor)
    │
    ▼
Ledger: Cost logged, dashboard updated
```

## Tech Approach [DONE]

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 15 (App Router) | SSR, API routes, mobile-first |
| Styling | Tailwind CSS | Responsive utility-first CSS |
| Auth | Clerk (`@clerk/nextjs`) | Auth, roles (landlord/tenant), subscriptions/billing |
| Database | Supabase PostgreSQL | Properties, tenants, requests, vendors |
| File Storage | Supabase Storage | Tenant photo uploads |
| AI - Text | Claude Sonnet API | Classification, triage, cost estimation |
| AI - Vision | Claude Sonnet API (vision) | Photo analysis for damage assessment |
| Realtime | Supabase Realtime | Live request status updates (stretch) |
| Deployment | Vercel | Auto-deploy from main |
| Local Dev | Supabase CLI + Docker | Full local stack (Clerk uses dev keys, no local instance) |

### Key Libraries [DONE]

All installed in `apps/web/package.json`:
- `@clerk/nextjs` — auth, middleware, user management, subscription billing
- `@supabase/supabase-js` + `@supabase/ssr` — Supabase client for Next.js
- `@anthropic-ai/sdk` — Claude API client
- `tailwindcss` — styling
- `zod` — runtime schema validation for API inputs
- `lucide-react` — icons

### Auth Architecture (Clerk + Supabase) [TODO]

> **Status**: Architecture defined. Middleware built (`middleware.ts`) with role-based routing. Clerk helpers built (`lib/clerk.ts`). Need: Clerk dev keys in `.env.local`, role metadata setup in Clerk dashboard, webhook for user sync to Supabase.

Clerk owns auth and user sessions. Supabase is used as a pure database (no Supabase Auth). The flow:

1. User signs in via Clerk (email/password, Google OAuth, etc.)
2. Clerk middleware protects routes and provides `userId` + custom claims (`role: landlord|tenant`)
3. API routes use Clerk's `auth()` to get the user, then query Supabase with a service-role key
4. RLS policies on Supabase tables use a `clerk_user_id` column (not `auth.users`)
5. Clerk handles subscription tiers (free beta → paid plans) via Clerk Billing

## Data Model [TODO]

### Supabase Tables [TODO]

> **Status**: Schema defined below. No Supabase migrations created yet. Need to run `supabase init`, create migration files, and `supabase db push`.

Since Clerk owns auth (not Supabase Auth), user references use `text` columns storing Clerk user IDs instead of `uuid references auth.users`.

```sql
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
```

### Data Access Pattern [TODO]

API routes use Clerk's `auth()` to authenticate, then query Supabase with a **service-role key** (bypasses RLS). Access control is enforced in application code by filtering on `landlord_id = clerkUserId`. This is simpler than RLS for the Clerk + Supabase combo.

> **Status**: Pattern defined. API routes currently return mock data. Need to replace mock responses with real Supabase queries using this pattern.

### Supabase Storage Buckets [TODO]

- `request-photos` — tenant-uploaded maintenance photos. Uploads go through API routes (which verify Clerk auth), not direct Supabase client uploads.

> **Status**: Not created. Need to create bucket via Supabase CLI/dashboard and wire `/api/upload` route.

## Pages & Components [DONE]

> All pages, layouts, components, and API route stubs below are built and compiling. They use mock data from `lib/mock-data.ts`. No tasks needed for this section — wiring to real data is covered in the [TODO] sections above.

### App Structure (Next.js Route Groups) [DONE]

```
apps/web/app/
├── layout.tsx                          — ClerkProvider + TooltipProvider + Toaster
├── (auth)/
│   ├── layout.tsx                      — Centered card shell, no nav
│   ├── sign-in/[[...sign-in]]/        — Clerk SignIn
│   └── sign-up/[[...sign-up]]/        — Clerk SignUp
├── (tenant)/
│   ├── layout.tsx                      — Top header (Liz logo + UserButton) + 2-item bottom nav
│   ├── submit/                         — Submit form → Gatekeeper state machine
│   ├── requests/                       — Request list with tabs (All/Active/Resolved)
│   └── requests/[id]/                  — Read-only request detail
└── (landlord)/
    ├── layout.tsx                      — SidebarProvider + AppSidebar (desktop) + bottom nav (mobile)
    ├── dashboard/                      — Stat cards + emergency banner + spend chart
    ├── requests/                       — DataTable (desktop) / cards (mobile) with filters
    ├── requests/[id]/                  — 2-col detail: AI analysis + approve/dispatch
    ├── properties/                     — CRUD with collapsible tenant lists
    └── vendors/                        — Grid CRUD with Sheet forms
```

### Public Pages (Clerk-managed) [DONE]
- `/sign-in` — Clerk `<SignIn />` in centered card layout
- `/sign-up` — Clerk `<SignUp />` in centered card layout

### Tenant Pages [DONE]
- `/submit` — State machine: idle → uploading → submitting → gatekeeper → resolved/escalated. Uses `SubmitForm` + `PhotoUploader` + `GatekeeperResponse` components.
- `/my-requests` — Tab-filtered list (All/Active/Resolved) using `RequestCard` components. Empty state with CTA to submit.
- `/my-requests/[id]` — Read-only detail: tenant message, AI classification, status badge.

### Landlord Pages [DONE]
- `/dashboard` — Emergency alert banner (if any), 4 stat cards (emergency/open/resolution time/spend), spend vs rent bar chart (Recharts), recent requests list.
- `/requests` — Tabbed view (All/Emergency/In Progress/Resolved) + filter bar (property, urgency, search). Desktop: shadcn Table. Mobile: RequestCard list.
- `/requests/[id]` — Two-column on desktop (`lg:grid-cols-3`). Left: message, photos, work order draft. Right (sticky): AI classification card, cost estimate, vendor selector, approve button. Mobile: single column + sticky bottom approve bar.
- `/properties` — Card per property with `Collapsible` tenant list. Add/edit via `Sheet` forms. Delete via `AlertDialog`.
- `/vendors` — Responsive grid (`1/2/3 cols`). Card per vendor with specialty badge. Add/edit via `Sheet`, delete via `AlertDialog`.

### Navigation [DONE]
- **Tenant**: Sticky top header + 2-item bottom nav (Submit, My Requests). Mobile-first, no sidebar.
- **Landlord**: `sidebar-07` pattern on desktop (Dashboard, Requests, Properties, Vendors). Bottom nav on mobile.
- **Middleware**: Role-based redirects (tenant→/submit, landlord→/dashboard). Cross-role access blocked.

### Custom Components (Built) [DONE]

| Component | Location | Purpose |
|-----------|----------|---------|
| `AppSidebar` | `components/layout/` | Landlord sidebar with nav items |
| `SiteHeader` | `components/layout/` | Breadcrumb + user menu |
| `LandlordBottomNav` | `components/layout/` | Mobile bottom nav for landlords |
| `RequestCard` | `components/requests/` | Urgency-accented card with category icon |
| `UrgencyBadge` | `components/requests/` | Color-coded: red/amber/green + icon |
| `StatusBadge` | `components/requests/` | Status display (submitted→dispatched→resolved) |
| `AiClassificationCard` | `components/requests/` | Category, urgency, confidence bar, action |
| `CostEstimateCard` | `components/requests/` | Low–high range + "AI Estimate" disclaimer |
| `VendorSelector` | `components/requests/` | Select filtered by specialty + contact info |
| `ApproveButton` | `components/requests/` | AlertDialog confirmation → Sonner toast |
| `WorkOrderDraft` | `components/requests/` | Editable textarea with AI pre-fill |
| `PhotoUploader` | `components/forms/` | Camera/file input + grid preview + max 5 |
| `SubmitForm` | `components/forms/` | Card form with textarea + photo uploader |
| `GatekeeperResponse` | `components/forms/` | Troubleshooting guide or escalation |
| `PropertyForm` | `components/forms/` | Sheet form for property CRUD |
| `TenantForm` | `components/forms/` | Sheet form for tenant CRUD |
| `VendorForm` | `components/forms/` | Sheet form for vendor CRUD |
| `SectionCards` | `components/dashboard/` | 4 stat cards grid |
| `EmergencyAlertBanner` | `components/dashboard/` | Red alert with "Review Now" link |
| `SpendChart` | `components/dashboard/` | Recharts bar chart: spend vs rent |
| `PageHeader` | `components/shared/` | Title + optional action button |
| `EmptyState` | `components/shared/` | Icon + message + CTA |

### shadcn/ui Components Used [DONE]
`alert-dialog`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `chart`, `collapsible`, `dialog`, `drawer`, `dropdown-menu`, `input`, `label`, `progress`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `table`, `tabs`, `textarea`, `tooltip`

### API Routes (Stubbed) [DONE]

> **Status**: All route files exist and compile. They return mock/placeholder responses. Wiring to real Supabase is a [TODO] tracked above.

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/intake` | POST | Submit maintenance request |
| `/api/upload` | POST | Upload photos to Supabase Storage |
| `/api/classify` | POST | AI classification (mock for now) |
| `/api/requests` | GET | List requests (role-filtered) |
| `/api/requests/[id]` | GET, PATCH | Request detail + updates |
| `/api/requests/[id]/dispatch` | POST | Dispatch vendor |
| `/api/properties` | GET, POST | List/create properties |
| `/api/properties/[id]` | GET, PATCH, DELETE | Property CRUD |
| `/api/properties/[id]/tenants` | POST | Add tenant to property |
| `/api/tenants/[id]` | PATCH, DELETE | Tenant updates |
| `/api/vendors` | GET, POST | List/create vendors |
| `/api/vendors/[id]` | PATCH, DELETE | Vendor CRUD |
| `/api/dashboard/stats` | GET | Emergency/open counts, resolution time, spend |
| `/api/dashboard/spend-chart` | GET | Spend vs rent per property |

### Lib Utilities (Built) [DONE]

| File | Purpose |
|------|---------|
| `lib/supabase/server.ts` | Server-side Supabase client (service role key) |
| `lib/supabase/client.ts` | Browser Supabase client (anon key) |
| `lib/clerk.ts` | `getRole()`, `requireRole()` helpers |
| `lib/validations.ts` | Zod schemas: intake, property, tenant, vendor, dispatch |
| `lib/mock-data.ts` | Sample requests, properties, vendors for UI development |
| `lib/utils.ts` | `cn()` utility |

## The Core Four — Implementation Detail

### 1. The Gatekeeper (Communication) — UI [DONE], AI [TODO]

**Trigger**: Tenant submits a request.

**AI Prompt Flow** [TODO]:
1. Send tenant message to Claude Sonnet
2. Ask: "Is this something the tenant can likely resolve themselves?"
3. If yes: Return a troubleshooting guide (e.g., "Check the circuit breaker") and mark `ai_self_resolvable = true`
4. If no: Proceed to Estimator

**UI** [DONE]: Tenant sees the troubleshooting suggestion with options: "This fixed it" (closes request) or "I still need help" (escalates to landlord). Currently uses `MOCK_GATEKEEPER_RESPONSE` in `submit/page.tsx`.

### 2. The Estimator (Maintenance) — UI [DONE], AI [TODO]

**Trigger**: Request not self-resolvable, or tenant escalates.

**AI Prompt Flow** [TODO]:
1. Send tenant message + all photos to Claude Sonnet (vision)
2. Ask for: category, urgency, recommended action, cost estimate range
3. Store all AI output on the `maintenance_requests` row

**Prompt includes**: The 7 categories and 3 urgency levels from the intake schema, plus instruction to estimate repair cost range based on typical market rates.

> **Status**: `/api/classify` route exists but returns mock data. Need real Claude Sonnet + Vision integration.

### 3. The Matchmaker (Vendor Dispatch) — UI [DONE], Backend [TODO]

**Trigger**: Landlord views a triaged request.

**Flow**:
1. [DONE] Show AI classification + cost estimate + photos
2. [DONE] Suggest matching vendor from landlord's vendor list (by specialty)
3. [TODO] AI drafts a work order with: issue description, address, tenant contact, photos
4. [DONE] Landlord reviews, edits if needed, clicks "Approve & Send"
5. [TODO] MVP: Work order saved to DB, vendor marked on request. Future: SMS/email to vendor.

### 4. The Ledger (Operations) — UI [DONE], Backend [TODO]

**Dashboard shows** [DONE — with mock data]:
- Total maintenance requests (this month / all time)
- Requests by urgency (emergency / medium / low counts)
- Maintenance spend vs. monthly rent per property
- Average time to resolution

> **Status**: Dashboard, SectionCards, SpendChart all built. Currently display hardcoded mock values. Need to wire `/api/dashboard/stats` and `/api/dashboard/spend-chart` to real Supabase queries.

## Integration Points

- [DONE] **Clerk** ↔ Middleware, role-based routing, auth layouts. [TODO] Dev keys, role metadata config, webhook for user sync.
- [TODO] **Supabase Storage** ↔ Photo upload via API routes, photo display on `/requests/[id]`
- [TODO] **Claude API** ↔ `/api/classify` route (called after form submission). Route exists, needs real Claude Sonnet call.
- [TODO] **Supabase Realtime** ↔ Request status updates (stretch goal for MVP)

## Tasks

Generated by `/create-feature-tasks-in-backlog ai-maintenance-intake-mvp`. Task IDs 001–015. Task files live in `backlog/`, `doing/`, and `done/` subdirectories of this feature folder.

### Foundation (no dependencies)
| ID | Tier | Task | Depends On |
|----|------|------|------------|
| 001 | Haiku | Initialize Supabase and create database migrations | — |
| 002 | Haiku | Configure Clerk dev keys and role metadata | — |

### Backend API Wiring (depends on Supabase)
| ID | Tier | Task | Depends On |
|----|------|------|------------|
| 003 | Sonnet | Wire properties and tenants API routes to Supabase | 001 |
| 004 | Sonnet | Wire vendors API routes to Supabase | 001 |
| 005 | Sonnet | Wire requests list and detail API routes to Supabase | 001 |
| 006 | Sonnet | Wire intake submission and photo upload to Supabase | 001 |
| 007 | Sonnet | Wire dashboard stats and spend chart to Supabase | 001 |

### AI Integration
| ID | Tier | Task | Depends On |
|----|------|------|------------|
| 008 | Sonnet | Implement Claude AI classification pipeline (Gatekeeper + Estimator) | 001 |
| 009 | Sonnet | Implement AI work order draft generation | 001, 008 |
| 010 | Sonnet | Wire dispatch API route to Supabase | 001, 005 |

### Frontend Wiring
| ID | Tier | Task | Depends On |
|----|------|------|------------|
| 011 | Opus | Wire tenant pages to real API calls | 005, 006, 008 |
| 012 | Opus | Wire landlord pages to real API calls | 003, 004, 005, 007, 009, 010 |

### Infrastructure
| ID | Tier | Task | Depends On |
|----|------|------|------------|
| 013 | Sonnet | Create Clerk webhook for user sync to Supabase | 001, 002 |
| 014 | Haiku | Configure Vercel deployment | 011, 012, 013 |
| 015 | Haiku | Write unit tests for API routes | 003, 004, 005, 006, 007, 010 |

## Manual Testing Checklist [TODO]

> Cannot be completed until backend integration is done. All items below are untested.

Use this checklist to manually verify the MVP end-to-end. Test on mobile (Chrome DevTools device mode or real phone) since this is mobile-first.

### Setup Verification [TODO]
- [ ] `supabase start` launches all local services (Postgres, Storage, Studio)
- [ ] `npm run dev` starts Next.js on localhost:3000
- [ ] Supabase Studio accessible at localhost:54323
- [ ] Environment variables loaded (`.env.local` has Supabase, Claude, and Clerk keys)

### Auth Flow (Clerk) [TODO]
- [ ] Sign up as a landlord — Clerk sign-up, role set in metadata, redirected to dashboard
- [ ] Sign up as a tenant — Clerk sign-up, role set in metadata, redirected to submit page
- [ ] Log in with existing credentials — correct role-based redirect
- [ ] Google OAuth sign-in — works (if configured in Clerk dashboard)
- [ ] Log out — Clerk session cleared, redirected to sign-in
- [ ] Unauthorized access — visiting `/dashboard` as tenant redirects to `/submit`
- [ ] Unauthenticated access — visiting any protected page redirects to `/sign-in`

### Tenant: Submit a Request [TODO]
- [ ] Navigate to `/submit` on mobile — form is usable, no horizontal scroll
- [ ] Type a maintenance issue description (e.g., "Kitchen sink is leaking badly")
- [ ] Upload 1 photo via camera or file picker — preview shows
- [ ] Upload 3 photos — all previews show, can remove one
- [ ] Submit with no photos — works (photos are optional)
- [ ] Submit with empty message — shows validation error
- [ ] After submit: Gatekeeper response appears (troubleshooting guide OR escalation)
- [ ] Click "This fixed it" — request marked as resolved
- [ ] Click "I still need help" — request escalated, AI classification runs

### Tenant: View Request Status [TODO]
- [ ] Navigate to `/my-requests` — see list of own requests
- [ ] Each request shows: status badge, category, date
- [ ] Tap a request — see full details, AI classification, photos

### Landlord: Dashboard [TODO]
- [ ] Navigate to `/dashboard` — see overview stats
- [ ] Request count by urgency shows correct numbers
- [ ] Spend vs. rent chart renders (or placeholder if no resolved requests)
- [ ] Emergency requests are visually prominent

### Landlord: Review Requests [TODO]
- [ ] Navigate to `/requests` — see all requests across properties
- [ ] Filter by property — only shows that property's requests
- [ ] Filter by urgency — correctly filters
- [ ] Emergency requests appear at top or are visually highlighted
- [ ] Tap a request — see full AI analysis

### Landlord: Request Detail [TODO]
- [ ] See tenant message + uploaded photos (tap to zoom)
- [ ] See AI classification: category, urgency, confidence score
- [ ] See AI cost estimate range (e.g., "$150 - $400")
- [ ] See AI recommended action
- [ ] See suggested vendor (matching specialty from vendor list)
- [ ] See AI-drafted work order text
- [ ] Edit work order text — changes persist
- [ ] Click "Approve & Send" — request status changes to "dispatched"
- [ ] Add landlord notes — saves correctly

### Landlord: Manage Properties [TODO]
- [ ] Add a new property (name, address, unit count, monthly rent)
- [ ] Edit a property
- [ ] Add a tenant to a property (name, email, phone, unit number)
- [ ] View tenants for a property

### Landlord: Manage Vendors [TODO]
- [ ] Add a vendor (name, phone, email, specialty)
- [ ] Edit a vendor
- [ ] Delete a vendor
- [ ] Vendor specialty matches maintenance categories (plumbing, electrical, etc.)

### AI Quality Checks [TODO]
- [ ] Submit "My toilet is overflowing" — should classify as plumbing / emergency
- [ ] Submit "Light fixture flickers sometimes" — should classify as electrical / low
- [ ] Submit "Cockroaches in the kitchen" with photo — should classify as pest / medium
- [ ] Submit "AC is making a weird noise" — Gatekeeper should suggest "Check if filter is clean"
- [ ] Cost estimates seem reasonable for the issue type
- [ ] Confidence scores appear (0.0 - 1.0 range)

### Mobile Responsiveness [TODO]
- [ ] All pages usable on iPhone SE (375px width)
- [ ] All pages usable on iPhone 14 (390px width)
- [ ] Photo upload works via mobile camera
- [ ] No horizontal scrolling on any page
- [ ] Touch targets are at least 44x44px
- [ ] Forms don't get hidden behind mobile keyboard

### Edge Cases [TODO]
- [ ] Submit request with very long message (1000+ chars) — handles gracefully
- [ ] Submit request with special characters — no XSS, displays correctly
- [ ] Upload a very large photo (10MB+) — either uploads or shows size error
- [ ] Upload a non-image file — shows validation error
- [ ] Claude API down/slow — shows user-friendly error, request still saved
- [ ] Multiple rapid submissions — no duplicate requests
- [ ] Landlord with no properties — sees empty state with "Add Property" CTA
- [ ] Landlord with no vendors — vendor suggestion shows "No vendors configured"

## Open Questions

1. ~~**Tenant auth for MVP**~~ — **DECIDED**: Clerk handles auth for both landlords and tenants. Role stored in Clerk user metadata. Subscriptions/billing handled via Clerk Billing.
2. **Vendor dispatch MVP**: Is saving the work order to the DB enough, or do we need SMS/email dispatch in v1?
   - Recommendation: DB-only for MVP, add Twilio SMS in Phase 2.
3. ~~**Cost estimation accuracy**~~ — **DECIDED**: Shown as "AI Estimate" with a range + disclaimer "Based on typical market rates (AI Estimate)". Implemented in `CostEstimateCard`.
4. **Anonymous tenant submission** — Should tenants be required to create a Clerk account, or submit via a shareable link without signing up? Reduces friction but complicates status tracking. Current implementation requires auth.
5. **Real-time updates** — Current plan: client-side polling or page refresh. Supabase Realtime is a stretch goal. No layout changes needed if added later.
6. **Zero state for new landlords** — Dashboard needs a "Getting Started" checklist when landlord has no properties/requests. Not yet implemented.
