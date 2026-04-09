# Feature: Property-Centric Dashboard

**ID**: P1-Tkt-001 (Work Stream 2)
**Ticket**: T-016
**Phase**: 1 — MVP
**Parent**: [P1-Tkt-001-mvp-ux-overhaul](./README.md)

## TL;DR

Redesign the landlord dashboard around properties. Add a horizontal property selector bar with house icons at the top. Clicking a property drills into a per-property view showing rent summary, work order history, tenant info, documents, and photos. The default "All Properties" view retains the current aggregate dashboard (stat cards, spend chart, recent requests) with the property selector integrated above it.

## Summary

The current dashboard (`/dashboard`) shows four aggregate stat cards (emergencies, open requests, avg resolution, monthly spend), a spend-vs-rent bar chart, and the three most recent maintenance requests. It has no concept of per-property drill-down — landlords cannot see a single property's data without navigating to the properties page.

This feature introduces a **property-centric navigation paradigm** for the dashboard:

1. **Property Selector Bar** — A horizontal row of house-shaped icons pinned to the top of the dashboard. Each icon represents one property. "All Properties" is the default. Clicking an icon switches the dashboard content below to show only that property's data.

2. **Per-Property Drill-Down View** — When a specific property is selected, the dashboard body transforms to show that property's rent summary, work order history, tenant info (editable), document placeholders, and property photos.

3. **Enhanced Aggregate View** — The "All Properties" default view is the current dashboard content with the property selector bar integrated above it.

4. **Inline Tenant Editing** — Landlords can update tenant info directly from the property drill-down (e.g., when a new tenant moves in) without navigating to the Properties page.

5. **Late Payment Alert** — A prominent red banner appears when rent is overdue, using the same visual language as the existing `EmergencyAlertBanner`.

Some data Liz wants (rent payment history, lease info, document storage, inspection photos) does not exist in the current data model. This plan specifies exactly what is added now versus what is deferred to P1-006 (Lease & Document Management), P2-001 (Rent Reminder), and P2-004 (Payment Integration).

## User Stories

### Landlord

- As a landlord, I want to see all my properties as house icons at the top of my dashboard so I can quickly navigate between them.
- As a landlord, I want to click a property icon and see only that property's data (rent, work orders, tenants, photos) so I can focus on one property at a time.
- As a landlord, I want to see an "All Properties" aggregate view by default so I get an overall summary when I first land on the dashboard.
- As a landlord, I want to see each property's rent amount, last rent paid date, and payment status so I know which tenants are current.
- As a landlord, I want to be immediately notified (banner alert) when a tenant's rent is late so I can follow up.
- As a landlord, I want to see the full work order history for a specific property (newest first, with status badges) so I can track maintenance activity.
- As a landlord, I want to view and edit tenant info from the property drill-down so I can update records when tenants change without navigating to a different page.
- As a landlord, I want to see placeholder sections for lease documents, receipts, and inspection photos so I know those features are coming.
- As a landlord with many properties, I want the property selector to scroll horizontally so all properties remain accessible without breaking the layout.
- As a landlord on mobile, I want the property selector to work as a horizontal scroll or dropdown so it remains usable on small screens.

## Architecture

```
Dashboard Page (/dashboard)
│
├── PropertySelectorBar
│   ├── "All" button (default selected)
│   └── PropertyIcon[] (one per property, horizontal scroll)
│
├── [selectedPropertyId === null] → AggregateView
│   ├── EmergencyAlertBanner (existing)
│   ├── OnboardingBanner (existing, conditional)
│   ├── SectionCards (existing — all-property stats)
│   ├── SpendChart (existing — all-property chart)
│   └── Recent Requests (existing)
│
└── [selectedPropertyId !== null] → PropertyDrillDown
    ├── PropertyHeader (name, address, quick stats)
    ├── LatePaymentBanner (conditional — if rent overdue)
    ├── Tabs
    │   ├── "Overview" tab
    │   │   ├── RentSummaryCard
    │   │   ├── PropertyStatsCards (emergencies, open, avg resolution, spend — filtered)
    │   │   └── SpendChart (single property)
    │   ├── "Work Orders" tab
    │   │   └── WorkOrderHistory (table/list, filtered to this property)
    │   ├── "Tenants" tab
    │   │   └── TenantList (editable inline, with add/edit/remove)
    │   ├── "Documents" tab (placeholder)
    │   │   └── DocumentsPlaceholder ("Coming soon — Lease & Document Management")
    │   └── "Photos" tab (placeholder)
    │       └── PhotosPlaceholder ("Coming soon — upload property & inspection photos")
    └── (Sheets for tenant edit — reuses existing TenantForm)
```

### Data Flow

```
Dashboard mounts
  → GET /api/properties (fetches all properties for the selector)
  → GET /api/dashboard/stats (aggregate stats — existing)
  → GET /api/dashboard/spend-chart (aggregate chart — existing)
  → GET /api/requests (recent requests — existing)

User clicks a property icon
  → GET /api/dashboard/stats?propertyId={id} (filtered stats — new query param)
  → GET /api/dashboard/spend-chart?propertyId={id} (single property chart — new query param)
  → GET /api/requests?propertyId={id} (filtered requests — new query param)
  → GET /api/properties/{id}/rent-status (new endpoint — rent summary)
```

### URL Strategy

The selected property is stored in a URL search parameter for shareability and back-button support:

- `/dashboard` — All Properties (default)
- `/dashboard?property={id}` — Property drill-down

This allows landlords to bookmark or share a link to a specific property's dashboard.

### New API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/properties/[id]/rent-status` | Fetch rent summary for a property (amount, last paid, status) |

### Modified API Routes

| Method | Route | Change |
|--------|-------|--------|
| GET | `/api/dashboard/stats` | Accept optional `?propertyId=` query param to filter stats to one property |
| GET | `/api/dashboard/spend-chart` | Accept optional `?propertyId=` query param to return single-property data |
| GET | `/api/requests` | Accept optional `?propertyId=` query param to filter requests |

## Tech Approach

### State Management

The dashboard page uses `useSearchParams()` to read the `property` query parameter. If present, it renders `PropertyDrillDown`; if absent, it renders the existing aggregate view components.

```typescript
const searchParams = useSearchParams();
const selectedPropertyId = searchParams.get("property"); // null = all properties
```

`PropertySelectorBar` updates the URL via `router.push` (shallow) when a property icon is clicked. This preserves browser history and makes the selection bookmarkable.

### Property Selector Bar

A client component that:
1. Receives the list of properties from the parent (already fetched by the dashboard page).
2. Renders a horizontally scrollable row using `ScrollArea` (horizontal orientation).
3. Each property is a clickable icon button with the property name below.
4. The "All Properties" option is always first (represented by a grid icon).
5. The selected item gets a highlighted ring/background.

On mobile (< 640px), the selector degrades to a `Select` dropdown to save vertical space. The component detects viewport width via a `useMediaQuery` hook or CSS-only approach with hidden/shown elements.

### Property Drill-Down View

Uses shadcn `Tabs` (already installed) for the five sections: Overview, Work Orders, Tenants, Documents, Photos.

- **Overview tab** reuses `SectionCards` and `SpendChart` with filtered data.
- **Work Orders tab** uses shadcn `Table` (already installed) with `Badge` status indicators.
- **Tenants tab** reuses the tenant display pattern from `PropertiesPage` — tenant cards with edit/delete via `Sheet` and `TenantForm`.
- **Documents tab** and **Photos tab** are placeholder cards linking to future features.

### Late Payment Banner

A new component following the same pattern as `EmergencyAlertBanner`:
- Red card with `AlertTriangle` icon when rent is overdue.
- Shows how many days overdue.
- Appears both in the property drill-down AND in the aggregate view (as a line item per property with late rent).

### Skeleton Loading

The dashboard already has skeleton loading. Extend it:
- Property selector bar: row of skeleton circles during load.
- Property drill-down: skeleton cards matching each section's layout.

### Existing Components Reused

| Component | Current Location | Reuse Strategy |
|-----------|-----------------|----------------|
| `SectionCards` | `components/dashboard/section-cards.tsx` | Pass filtered stats (no change needed) |
| `SpendChart` | `components/dashboard/spend-chart.tsx` | Pass filtered data (no change needed) |
| `EmergencyAlertBanner` | `components/dashboard/emergency-alert-banner.tsx` | Render in both views (no change needed) |
| `OnboardingBanner` | `components/dashboard/onboarding-banner.tsx` | Aggregate view only (no change needed) |
| `RequestCard` | `components/requests/request-card.tsx` | Work order history list (no change needed) |
| `TenantForm` | `components/forms/tenant-form.tsx` | Tenant editing in drill-down (no change needed) |
| `PageHeader` | `components/shared/page-header.tsx` | Dashboard title (no change needed) |

## UI Development Process

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design property-centric-dashboard      # Phase 1: Plan layout + components
/ui-build property-centric-dashboard       # Phase 2: Build from plan
/ui-refine PropertySelectorBar             # Phase 3: Polish selector interactions
/ui-refine PropertyDrillDown               # Phase 3: Polish drill-down layout
/ui-refine LatePaymentBanner               # Phase 3: Polish alert styling
```

### Screen Design: Property Selector Bar

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  ┌───┐  │  │  /\     │  │  /\     │  │  /\     │  │  /\     │ │
│  │  │|||│  │  │ /  \    │  │ /  \    │  │ /  \    │  │ /  \    │ │
│  │  │|||│  │  │ |  |    │  │ |  |    │  │ |  |    │  │ |  |    │ │
│  │  └───┘  │  │ |__|    │  │ |__|    │  │ |__|    │  │ |__|    │ │
│  │   All   │  │ Oak St  │  │ Maple   │  │ Pine    │  │ Elm Rd  │ │
│  │ [active]│  │         │  │  Ave    │  │  Ln     │  │         │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │
│  ◄────────────── horizontally scrollable ──────────────────────►   │
└─────────────────────────────────────────────────────────────────────┘
```

**Desktop (lg+)**: Full horizontal row. Each icon is ~80px wide. `ScrollArea` with horizontal orientation enables scrolling when properties exceed viewport width. Fade indicators on edges when scrollable.

**Tablet (md)**: Same layout but icons shrink slightly (~64px). Still horizontally scrollable.

**Mobile (< 640px)**: Degrades to a shadcn `Select` dropdown:
```
┌──────────────────────────────┐
│  Property: [All Properties ▼] │
└──────────────────────────────┘
```
This saves vertical space on small screens where a horizontal icon row would be cramped.

### Screen Design: Property Drill-Down — Overview Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Dashboard                                                         │
│                                                                      │
│ ┌───────────────────────────────────────────────────────────────────┐│
│ │ 123 Oak Street, Unit A                              [Edit ✎]     ││
│ │ 3 bed / 2 bath • 2 tenants                                       ││
│ └───────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ ┌── LATE RENT ALERT ─────────────────────────────────────────┐      │
│ │ ⚠ Rent is 5 days overdue ($1,800/mo). Last paid: Mar 1.   │      │
│ └────────────────────────────────────────────────────────────┘      │
│                                                                      │
│ [Overview] [Work Orders] [Tenants] [Documents] [Photos]              │
│ ─────────────────────────────────────────────────────────────        │
│                                                                      │
│ ┌─── Rent Summary ───┐  ┌─── Emergencies ─┐  ┌─── Open ─────┐     │
│ │ $1,800 /mo         │  │ 1               │  │ 3            │     │
│ │ Last paid: Mar 1   │  │                 │  │              │     │
│ │ Status: ● OVERDUE  │  │                 │  │              │     │
│ └────────────────────┘  └─────────────────┘  └──────────────┘     │
│                                                                      │
│ ┌─── Spend vs. Rent (This Property) ────────────────────────┐      │
│ │ [Bar chart — single property, monthly trend]               │      │
│ └────────────────────────────────────────────────────────────┘      │
│                                                                      │
│ ┌─── Recent Work Orders ────────────────────────────────────┐      │
│ │ • Leaking faucet — Plumbing — Emergency — Dispatched      │      │
│ │ • Broken outlet — Electrical — Medium — Triaged           │      │
│ │ • Paint peeling — General — Low — Submitted               │      │
│ │                                     [View all →]           │      │
│ └────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### Screen Design: Property Drill-Down — Work Orders Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Overview] [Work Orders] [Tenants] [Documents] [Photos]              │
│ ─────────────────────────────────────────────────────────────        │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ Date       │ Issue              │ Category  │ Urgency │ Status │  │
│ │────────────┼────────────────────┼───────────┼─────────┼────────│  │
│ │ Apr 7      │ Leaking faucet     │ Plumbing  │ 🔴 Emrg │ Open   │  │
│ │ Apr 3      │ Broken outlet      │ Electrical│ 🟡 Med  │ Triaged│  │
│ │ Mar 28     │ Paint peeling      │ General   │ 🟢 Low  │ Closed │  │
│ │ Mar 15     │ AC not cooling     │ HVAC      │ 🟡 Med  │ Resolved│ │
│ │ Feb 20     │ Ant infestation    │ Pest      │ 🟢 Low  │ Resolved│ │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ Showing 5 of 12 work orders                      [Load more]        │
└─────────────────────────────────────────────────────────────────────┘
```

**Desktop**: Full `Table` with sortable columns.
**Mobile**: Each row becomes a `Card` (stacked layout) using `RequestCard` pattern.

### Screen Design: Property Drill-Down — Tenants Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Overview] [Work Orders] [Tenants] [Documents] [Photos]              │
│ ─────────────────────────────────────────────────────────────        │
│                                                                      │
│ ┌── John Doe ──────────────────────────────────────── [Edit] [✕] ──┐│
│ │ Unit: A                                                           ││
│ │ Email: john@example.com                                           ││
│ │ Phone: (555) 123-4567                                             ││
│ │ Move-in: Jan 15, 2025                                             ││
│ └───────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ ┌── Jane Smith ─────────────────────────────────────── [Edit] [✕] ─┐│
│ │ Unit: B                                                           ││
│ │ Email: jane@example.com                                           ││
│ │ Phone: (555) 987-6543                                             ││
│ │ Move-in: Mar 1, 2026                                              ││
│ └───────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ [+ Add Tenant]                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

Reuses the existing tenant card pattern from `PropertiesPage`. Edit/delete uses `Sheet` + `TenantForm` (already built). Add tenant button at the bottom.

### Screen Design: Documents Tab (Placeholder)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Overview] [Work Orders] [Tenants] [Documents] [Photos]              │
│ ─────────────────────────────────────────────────────────────        │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │             📄                                                  │  │
│ │     Lease & Document Management                                │  │
│ │                                                                │  │
│ │  This section will include:                                    │  │
│ │  • Lease agreements & end dates                                │  │
│ │  • Month-to-month status tracking                              │  │
│ │  • Work order receipts                                         │  │
│ │  • Inspection reports                                          │  │
│ │                                                                │  │
│ │  Coming in P1-006: Lease & Document Management                 │  │
│ └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Screen Design: Photos Tab (Placeholder)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Overview] [Work Orders] [Tenants] [Documents] [Photos]              │
│ ─────────────────────────────────────────────────────────────        │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │             📷                                                  │  │
│ │     Property Photos                                            │  │
│ │                                                                │  │
│ │  This section will include:                                    │  │
│ │  • Property exterior & interior photos                         │  │
│ │  • Move-in / move-out inspection photos                        │  │
│ │  • Before & after maintenance photos                           │  │
│ │                                                                │  │
│ │  Coming in P1-006: Lease & Document Management                 │  │
│ └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Screen Design: All Properties Aggregate View (Enhanced)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                            │
│                                                                      │
│ [Property Selector Bar — "All" active]                               │
│                                                                      │
│ ┌── LATE RENT ALERT ─────────────────────────────────────────┐      │
│ │ ⚠ 2 properties have overdue rent. [Review]                 │      │
│ └────────────────────────────────────────────────────────────┘      │
│                                                                      │
│ ┌── EMERGENCY ALERT ─────────────────────────────────────────┐      │
│ │ ⚠ 1 emergency request needs attention. [Review Now]        │      │
│ └────────────────────────────────────────────────────────────┘      │
│                                                                      │
│ ┌─ Emergencies ─┐ ┌─ Open Requests ─┐ ┌─ Avg Resolution ─┐ ┌─ Spend ─┐│
│ │ 1             │ │ 5               │ │ 3.2 days         │ │ $2,400  ││
│ └───────────────┘ └─────────────────┘ └──────────────────┘ └─────────┘│
│                                                                      │
│ ┌─── Spend vs. Rent ────────────────────────────────────────┐      │
│ │ [Existing bar chart — all properties]                      │      │
│ └────────────────────────────────────────────────────────────┘      │
│                                                                      │
│ ┌─── Recent Requests ───────────────────────────────────────┐      │
│ │ [Existing request cards]                                   │      │
│ └────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

The aggregate view is essentially the current dashboard with two additions:
1. `PropertySelectorBar` at the top (with "All" selected).
2. `LatePaymentBanner` below the selector (aggregated across all properties) — appears only if any property has overdue rent.

### shadcn Components Needed

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Stat cards, rent summary, tenant cards, placeholders |
| `button` | Installed | Property selector, edit actions, navigation |
| `badge` | Installed | Status badges, urgency indicators |
| `tabs` | Installed | Drill-down sections (Overview, Work Orders, Tenants, Documents, Photos) |
| `table` | Installed | Work order history |
| `scroll-area` | Installed | Horizontal scrolling property selector |
| `sheet` | Installed | Tenant edit side panel |
| `skeleton` | Installed | Loading states |
| `select` | Installed | Mobile property selector dropdown |
| `tooltip` | Installed | Property icon hover details |
| `avatar` | Installed | Tenant avatars (optional) |
| `separator` | Installed | Visual dividers in drill-down |
| `alert-dialog` | Installed | Confirm tenant delete |

All required components are already installed. No new shadcn installs needed.

### Component Hierarchy

```
DashboardPage (apps/web/app/(landlord)/dashboard/page.tsx) — MODIFIED
├── PageHeader ("Dashboard")
├── PropertySelectorBar (new component)
│   ├── [Desktop lg+] ScrollArea (horizontal)
│   │   ├── AllPropertiesIcon (grid icon + "All" label)
│   │   └── PropertyIcon[] (house icon + property name, one per property)
│   └── [Mobile < lg] Select dropdown
│       ├── "All Properties" option
│       └── Property option[] (name + address snippet)
│
├── [selectedPropertyId === null] → Aggregate View
│   ├── LatePaymentBanner (new — conditional, aggregate count)
│   ├── OnboardingBanner (existing)
│   ├── EmergencyAlertBanner (existing)
│   ├── SectionCards (existing — no changes)
│   ├── SpendChart (existing — no changes)
│   └── RecentRequests section (existing)
│
└── [selectedPropertyId !== null] → PropertyDrillDown (new component)
    ├── PropertyHeader (new — name, address, unit info)
    ├── LatePaymentBanner (new — conditional, single property)
    ├── Tabs
    │   ├── TabsTrigger "Overview"
    │   │   ├── RentSummaryCard (new component)
    │   │   │   └── Card: rent amount, last paid date, status indicator (green/red dot)
    │   │   ├── SectionCards (existing — filtered to this property)
    │   │   ├── SpendChart (existing — single property data)
    │   │   └── RecentWorkOrders (new — top 3 requests + "View all" link to Work Orders tab)
    │   ├── TabsTrigger "Work Orders"
    │   │   └── WorkOrderHistory (new component)
    │   │       ├── [Desktop] Table (date, issue, category, urgency badge, status badge)
    │   │       ├── [Mobile] RequestCard[] (stacked cards)
    │   │       └── "Load more" button (paginated, 10 at a time)
    │   ├── TabsTrigger "Tenants"
    │   │   └── TenantList (new component — mirrors PropertiesPage tenant section)
    │   │       ├── TenantCard[] (name, unit, email, phone, edit/delete buttons)
    │   │       ├── "Add Tenant" button
    │   │       └── Sheet + TenantForm (existing, for add/edit)
    │   ├── TabsTrigger "Documents"
    │   │   └── DocumentsPlaceholder (new — static card linking to P1-006)
    │   └── TabsTrigger "Photos"
    │       └── PhotosPlaceholder (new — static card linking to P1-006)
    └── Sheet (shared — for tenant editing)
        ├── SheetHeader
        └── TenantForm (existing component)
```

### Responsive Strategy

| Breakpoint | Property Selector | Drill-Down Layout | Work Order Table |
|------------|-------------------|-------------------|------------------|
| Mobile (< 640px) | `Select` dropdown | Tabs stack, full-width cards | `RequestCard` stacked list |
| Tablet (640px–1023px) | Horizontal scroll, 64px icons | Tabs, 2-col stat cards | `Table` with horizontal scroll |
| Desktop (1024px+) | Horizontal scroll, 80px icons | Tabs, 4-col stat cards | Full `Table` |

## Data Model

### What Exists Today

| Table | Relevant Columns | Notes |
|-------|-------------------|-------|
| `properties` | `id`, `landlord_id`, `name`, `address`, `unit_count`, `monthly_rent` | Has rent amount but no payment tracking |
| `tenants` | `id`, `property_id`, `name`, `email`, `phone`, `unit_number` | No move-in date, no lease info |
| `maintenance_requests` | `id`, `property_id`, `tenant_id`, `status`, `ai_category`, `ai_urgency`, `actual_cost`, `created_at`, `resolved_at` | Full work order data exists |
| `request_photos` | `id`, `request_id`, `storage_path`, `file_type` | Photos per request (not per property) |

### New Table: `rent_payments` (MVP-scoped)

This table tracks rent payment records for the "last paid" and "overdue" status display. It is intentionally simple for MVP — P2-001 (Rent Reminder) and P2-004 (Payment Integration) will extend it with due dates, recurring schedules, payment methods, and Stripe integration.

```sql
create table rent_payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  tenant_id uuid references tenants,         -- nullable: payment may be from unknown source
  amount decimal(10,2) not null,
  paid_at timestamptz not null,              -- when payment was received
  period_start date not null,                -- rent period start (e.g., 2026-04-01)
  period_end date not null,                  -- rent period end (e.g., 2026-04-30)
  notes text,                                -- optional: check #, memo, etc.
  created_at timestamptz default now()
);

create index idx_rent_payments_property on rent_payments(property_id);
create index idx_rent_payments_paid_at on rent_payments(property_id, paid_at desc);
```

### Modify Existing Table: `tenants`

Add a `move_in_date` column for display in the tenant card. This is a simple addition — full lease management is deferred to P1-006.

```sql
alter table tenants
  add column move_in_date date;
```

### Modify Existing Table: `properties`

Add a `rent_due_day` column so the system knows when rent is considered overdue. Default to the 1st of the month.

```sql
alter table properties
  add column rent_due_day int not null default 1;
  -- Day of month rent is due (1–28). Constraint: 1 <= rent_due_day <= 28.

alter table properties
  add constraint chk_rent_due_day check (rent_due_day >= 1 and rent_due_day <= 28);
```

### New TypeScript Types

```typescript
export interface RentPayment {
  id: string;
  property_id: string;
  tenant_id: string | null;
  amount: number;
  paid_at: string;
  period_start: string;
  period_end: string;
  notes: string | null;
  created_at: string;
}

export interface RentStatus {
  property_id: string;
  monthly_rent: number;
  rent_due_day: number;
  last_paid_at: string | null;     // ISO date of most recent payment
  last_paid_amount: number | null;
  is_overdue: boolean;             // computed: no payment covers current period
  days_overdue: number;            // 0 if not overdue
}
```

### Modify Existing Types

```typescript
// Add to Property interface
export interface Property {
  // ... existing fields ...
  rent_due_day: number;
}

// Add to Tenant interface
export interface Tenant {
  // ... existing fields ...
  move_in_date: string | null;
}
```

### What Is Deferred to Other Features

| Data Need | Deferred To | Reason |
|-----------|------------|--------|
| Lease agreement documents | P1-006: Lease & Document Management | Requires Supabase Storage bucket + upload UI + document viewer |
| Lease end date & month-to-month status | P1-006: Lease & Document Management | Needs lease data model (start, end, renewal terms) |
| Rent due date reminders & recurring schedules | P2-001: Rent Reminder | Needs Vercel Cron jobs + notification system |
| Payment method & Stripe integration | P2-004: Payment Integration | Needs Stripe Connect setup |
| Receipts for work done | P1-006: Lease & Document Management | Receipts are documents — needs same storage infrastructure |
| Move-in / move-out inspection photos | P1-006: Lease & Document Management | Needs property-level photo storage (not request-level) |
| Property photos (exterior/interior) | P1-006: Lease & Document Management | Needs property-level photo storage |

The Documents and Photos tabs in this feature are **placeholder UI** — they show "Coming soon" cards that describe what will be available and link to the relevant feature. This sets user expectations and provides the navigation structure that P1-006 will fill in.

## Integration Points

### 1. Existing Dashboard Stats API (`/api/dashboard/stats`)

**Change**: Add optional `propertyId` query parameter.

Currently filters by all properties belonging to the landlord. When `propertyId` is provided, filter to just that one property. This requires minimal code change — the existing `propertyIds` array just becomes `[propertyId]` when the param is present.

### 2. Existing Spend Chart API (`/api/dashboard/spend-chart`)

**Change**: Add optional `propertyId` query parameter.

When filtering to one property, the chart shows monthly spend over time (last 6 months) instead of per-property comparison. This gives the single-property view a useful time-series chart rather than a single-bar chart.

### 3. Existing Requests API (`/api/requests`)

**Change**: Add optional `propertyId` query parameter.

Filter maintenance requests to a single property. Already has access to `property_id` in the query.

### 4. New Rent Status API (`/api/properties/[id]/rent-status`)

**Purpose**: Returns the rent payment status for a single property.

Logic:
1. Fetch the property's `monthly_rent` and `rent_due_day`.
2. Fetch the most recent `rent_payments` record for this property.
3. Determine if rent is overdue: check if any payment covers the current period (based on `period_start`/`period_end` and today's date vs. `rent_due_day`).
4. Return `RentStatus` object.

### 5. Properties API (`/api/properties`)

**Change**: Include `rent_due_day` in the response. Already returns properties — just needs the new column in the select query.

### 6. Tenants API

**Change**: Include `move_in_date` in tenant responses. Already returns tenant data — just needs the new column in the select query.

### 7. Dashboard Page (`/dashboard`)

**Major refactor**: The page is restructured from a flat list of components to a conditional layout based on `selectedPropertyId`. The existing aggregate view is wrapped in a conditional block, and the new drill-down view is added as the alternative path.

### 8. Rent Payment Entry

For MVP, rent payments are entered manually by the landlord from the property drill-down's Overview tab. A simple "Record Payment" button opens a dialog with amount, date, and optional notes. This is intentionally lightweight — P2-004 will add Stripe-powered automatic payment tracking.

### 9. Late Payment Notification

**MVP scope**: In-dashboard banner only. No email/SMS/push. The `LatePaymentBanner` component checks rent status on page load and displays a red alert if any property has overdue rent.

**Future (P2-001)**: Extend to email/SMS notifications via the notification service. The `is_overdue` flag from the rent status API will be the trigger.

## Manual Testing Checklist

### Property Selector Bar

- [ ] Dashboard loads with "All Properties" selected by default
- [ ] All landlord properties appear as house icons in the selector bar
- [ ] Clicking a property icon updates the URL to `/dashboard?property={id}`
- [ ] Clicking "All" returns to `/dashboard` (no query param)
- [ ] Selected property icon has a highlighted ring/background
- [ ] Selector scrolls horizontally when properties exceed viewport width
- [ ] On mobile (< 640px), selector renders as a `Select` dropdown instead of icons
- [ ] Direct navigation to `/dashboard?property={id}` loads the correct property
- [ ] Invalid property ID in URL falls back gracefully to aggregate view
- [ ] Loading state shows skeleton circles/rectangles for the selector

### Aggregate View (All Properties)

- [ ] Aggregate view shows all existing dashboard content (stat cards, chart, recent requests)
- [ ] `PropertySelectorBar` is visible above the existing content
- [ ] Late payment banner appears if any property has overdue rent
- [ ] Late payment banner shows count of properties with overdue rent
- [ ] Late payment banner "Review" link scrolls to / navigates to relevant properties
- [ ] Emergency alert banner still works as before
- [ ] Onboarding banner still works as before

### Property Drill-Down — Overview Tab

- [ ] Selecting a property shows `PropertyHeader` with name, address, unit info
- [ ] Rent summary card shows monthly rent amount, last paid date, and status
- [ ] Status indicator is green for current, red for overdue
- [ ] Late payment banner appears if rent is overdue for this property
- [ ] Stat cards show filtered stats for only this property
- [ ] Spend chart shows data for only this property
- [ ] "Recent Work Orders" section shows top 3 requests for this property
- [ ] "View all" link switches to the Work Orders tab

### Property Drill-Down — Work Orders Tab

- [ ] Work order table shows all maintenance requests for this property
- [ ] Requests are sorted newest first
- [ ] Each row shows date, issue description, category, urgency badge, status badge
- [ ] Clicking a work order row navigates to `/requests/{id}`
- [ ] "Load more" button appears when more than 10 requests exist
- [ ] On mobile, work orders render as stacked `RequestCard` components
- [ ] Empty state message when property has no work orders

### Property Drill-Down — Tenants Tab

- [ ] All tenants for the property are listed with name, unit, email, phone
- [ ] Move-in date is displayed if available
- [ ] "Edit" button opens a `Sheet` with `TenantForm` pre-filled
- [ ] Editing a tenant saves successfully and refreshes the list
- [ ] "Delete" button shows confirmation dialog
- [ ] Deleting a tenant removes them and refreshes the list
- [ ] "Add Tenant" button opens a blank `TenantForm` in a `Sheet`
- [ ] Adding a tenant saves successfully and refreshes the list

### Property Drill-Down — Documents Tab (Placeholder)

- [ ] Shows a placeholder card with "Coming soon" messaging
- [ ] Lists the features that will be available (lease, receipts, inspection reports)
- [ ] References P1-006 as the delivering feature

### Property Drill-Down — Photos Tab (Placeholder)

- [ ] Shows a placeholder card with "Coming soon" messaging
- [ ] Lists the features that will be available (property photos, inspection photos)
- [ ] References P1-006 as the delivering feature

### Rent Payment Recording

- [ ] "Record Payment" button is visible in the Overview tab rent summary card
- [ ] Clicking it opens a dialog with amount (pre-filled with monthly rent), date, and notes
- [ ] Submitting saves the payment and refreshes the rent status
- [ ] After recording a payment, the overdue banner disappears (if payment covers current period)
- [ ] Validation prevents submitting with empty amount or future dates

### Late Payment Banner

- [ ] Banner appears in aggregate view with count of properties having overdue rent
- [ ] Banner appears in property drill-down when that specific property has overdue rent
- [ ] Banner does not appear when all rent is current
- [ ] Banner uses the same visual style as `EmergencyAlertBanner` (red card, warning icon)

### Responsive Behavior

- [ ] Property selector switches to dropdown on mobile
- [ ] Drill-down tabs are scrollable on mobile (no overflow hidden)
- [ ] Stat cards stack to 2 columns on mobile, 4 on desktop
- [ ] Work order table switches to card view on mobile
- [ ] Tenant cards stack vertically on all screen sizes
- [ ] No horizontal overflow on any screen size

### Edge Cases

- [ ] Landlord with 0 properties sees "All Properties" view with empty state and no selector icons
- [ ] Landlord with 1 property sees the selector with "All" and one property icon
- [ ] Landlord with 20 properties — selector scrolls smoothly, no layout breakage
- [ ] Property with 0 tenants shows "No tenants yet" message in Tenants tab
- [ ] Property with 0 work orders shows empty state in Work Orders tab
- [ ] Property with no rent payments shows "No payments recorded" in rent summary
- [ ] Browser back button returns to previous property selection (URL-based state)
- [ ] Page refresh preserves property selection (URL-based state)

## Tasks

Tasks will be numbered starting at the next available ID in the backlog. Outline only — full task files will be generated by `/create-feature-tasks-in-backlog`.

| # | Tier | Title | Depends On |
|---|------|-------|------------|
| 1 | Haiku | Database migration — `rent_payments` table, `tenants.move_in_date`, `properties.rent_due_day` | -- |
| 2 | Haiku | TypeScript types — `RentPayment`, `RentStatus`, update `Property` and `Tenant` interfaces | 1 |
| 3 | Sonnet | Rent status API — `GET /api/properties/[id]/rent-status` | 1, 2 |
| 4 | Sonnet | Rent payment recording API — `POST /api/properties/[id]/rent-payments` | 1, 2 |
| 5 | Sonnet | Modify existing dashboard APIs — add `?propertyId` filter to stats, spend-chart, and requests endpoints | -- |
| 6 | Sonnet | Modify properties API — include `rent_due_day` in responses, update property form to accept it | 1 |
| 7 | Opus | Build `PropertySelectorBar` component — house icons, horizontal scroll, mobile dropdown | -- |
| 8 | Opus | Refactor dashboard page — URL-based property selection, conditional aggregate/drill-down rendering | 7 |
| 9 | Opus | Build `PropertyDrillDown` component — tabbed layout with Overview, Work Orders, Tenants, Documents, Photos tabs | 8 |
| 10 | Opus | Build `RentSummaryCard` + `LatePaymentBanner` components | 3 |
| 11 | Opus | Build `WorkOrderHistory` component — table (desktop) + card list (mobile), pagination | 5 |
| 12 | Sonnet | Build `TenantList` component in drill-down — reuse tenant card pattern + TenantForm Sheet | 9 |
| 13 | Haiku | Build `DocumentsPlaceholder` and `PhotosPlaceholder` components | 9 |
| 14 | Sonnet | Build rent payment recording dialog — "Record Payment" button + dialog form | 4, 10 |
| 15 | Opus | Integrate all drill-down sections — wire API calls, loading states, error handling, empty states | 9, 10, 11, 12, 13, 14 |
| 16 | Opus | Responsive polish — mobile dropdown selector, card-based work orders, tab scrolling | 15 |
| 17 | Haiku | Update `docs/endpoints.md` with new/modified API routes | 3, 4, 5, 6 |

**Tier breakdown**: 3 Haiku, 5 Sonnet, 6 Opus (front-end heavy feature)

**Dependency graph**:
- Tasks 1, 5, 7 are independent starting points (can run in parallel).
- Task 2 depends on 1 (types need schema).
- Tasks 3, 4, 6 depend on 1+2 (APIs need schema + types).
- Task 8 depends on 7 (page refactor needs selector).
- Task 9 depends on 8 (drill-down needs conditional rendering).
- Tasks 10–14 are drill-down sections that depend on 9 + their respective APIs.
- Task 15 integrates everything.
- Task 16 is final responsive polish.
- Task 17 (docs) can run any time after the APIs are built.

**Critical path**: 1 → 2 → 3 → 10 → 15 → 16 (rent status is the new data dependency; everything else builds on existing APIs).

## Open Questions

1. **Rent payment entry for MVP — manual only?** Recommendation: Yes. Landlords manually record rent payments via a simple "Record Payment" dialog. This is pragmatic for MVP. P2-004 (Payment Integration) adds Stripe-powered automatic tracking. The `rent_payments` table schema is designed to be extensible for that future integration.

2. **How many days grace period before "overdue"?** Recommendation: 0 days — if rent hasn't been recorded for the current period by the `rent_due_day`, it shows as overdue immediately. Landlords can adjust by setting `rent_due_day` to a later date if they want a grace period. A separate grace period setting could be added in P2-001.

3. **Spend chart — time series for single property?** Recommendation: Yes. When drilling into a single property, the spend chart should show monthly spend over the last 6 months (time series) instead of the per-property comparison. This gives more useful insight at the property level. The API change involves grouping by month instead of by property when `propertyId` is specified.

4. **Property selector — show property image vs. generic house icon?** Recommendation: Generic house icon for MVP. Property photos require Supabase Storage setup (coming in P1-006). The icon can be swapped for a thumbnail later when photos are available.

5. **Aggregate late payment banner — link behavior?** Recommendation: The "Review" action in the aggregate late payment banner should show a popover or navigate to a filtered view listing only properties with overdue rent. For MVP simplicity, it could simply select the first overdue property in the selector.

6. **Tab persistence within drill-down** — When switching between properties, should the active tab be preserved (e.g., if viewing Work Orders for Property A, then switching to Property B, stay on Work Orders)? Recommendation: Yes, preserve the active tab. This matches user intent — they are likely comparing the same data type across properties.

7. **Rent payments — who enters them?** For MVP, only the landlord. P2-004 adds tenant self-service payment which auto-creates records. The `tenant_id` field on `rent_payments` is nullable for this reason — landlord-entered payments may not be attributed to a specific tenant (e.g., a single rent check for a multi-unit property).
