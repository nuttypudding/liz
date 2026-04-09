# Feature: Rent Reminder

**ID**: P2-001
**Ticket**: T-004
**Phase**: 2

## TL;DR

Track rent due dates per tenant/unit, display rent status across landlord and tenant dashboards, and send automated reminders (upcoming, due today, overdue) via Vercel Cron. No payment processing -- this is a tracking and notification layer that prepares the data model for P2-004 (Payment Integration).

## Summary

Today Liz has no rent tracking. The `properties` table stores `monthly_rent` but there is no way to know which tenants have paid, which are overdue, or when rent is due. Landlords manage this manually or in spreadsheets.

This feature adds three capabilities:

1. **Rent ledger** -- A `rent_periods` table that generates monthly records per tenant with a due date, status (upcoming/due/paid/overdue/partial), and optional payment-recorded date. Landlords manually mark rent as paid (no payment gateway in MVP).
2. **Rent visibility** -- Landlords see a rent schedule page (table view of all units with rent status), a dashboard summary card (overdue count, total collected), and an overdue alert banner. Tenants see their own rent status and history.
3. **Automated reminders** -- A Vercel Cron job runs daily, checks rent_periods for upcoming (3 days out), due-today, and overdue records, and creates notification entries. MVP delivers these as in-app notifications (badge + dropdown). Email/SMS delivery is deferred to the `/notify` skill buildout.

This is the foundation for Phase 2 payment integration (P2-004) -- the rent_periods table is designed to accommodate a `payment_id` foreign key and `payment_method` column when payment processing is added later.

## User Stories

### Landlord

- As a landlord, I want to see which tenants have paid rent this month and which are overdue so I can follow up quickly.
- As a landlord, I want a monthly rent schedule page showing all my units, due dates, and payment status in one view.
- As a landlord, I want a dashboard card showing how many tenants are overdue, how many have paid, and total collected this month.
- As a landlord, I want an overdue alert banner on my dashboard when tenants are past due, similar to the emergency maintenance banner.
- As a landlord, I want to manually record a rent payment (mark as paid with date and optional notes) since there is no payment gateway yet.
- As a landlord, I want to set the rent due day (e.g., 1st of the month) per property so reminders fire at the right time.
- As a landlord, I want to toggle rent reminder notifications on or off in my settings.
- As a landlord, I want a daily/weekly overdue summary so I know the current state without checking the app.

### Tenant

- As a tenant, I want to see my rent status (upcoming, due, overdue, paid) so I know where I stand.
- As a tenant, I want to see my rent history (past months, amounts, dates paid) for my records.
- As a tenant, I want to receive a reminder 3 days before rent is due so I can prepare.
- As a tenant, I want to receive a reminder on the day rent is due.
- As a tenant, I want to be notified if my rent is overdue.

## Architecture

```
                              Vercel Cron (daily @ 6am UTC)
                                        |
                                        v
                          POST /api/cron/rent-reminders
                            |                    |
                            v                    v
                     Query rent_periods     Create notifications
                     (upcoming/due/overdue)  in notifications table
                            |
                            v
                     Update overdue status
                     (due -> overdue if past due_date)

Landlord Dashboard -----> GET /api/dashboard/rent-summary --> rent_periods aggregate
Rent Schedule Page -----> GET /api/rent                    --> rent_periods + tenants + properties
Mark Paid Action -------> PATCH /api/rent/[id]             --> update rent_periods row
Tenant Rent View -------> GET /api/tenant/rent             --> rent_periods for current tenant
Settings Page ----------> PUT /api/settings/profile        --> (existing) add notify_rent_reminders
Notification Bell ------> GET /api/notifications           --> notifications table
```

### New Route Group

```
apps/web/app/(landlord)/
├── rent/page.tsx                    -- Rent schedule page (table view)
├── rent/[id]/page.tsx               -- Single rent period detail / mark paid

apps/web/app/(tenant)/
├── rent/page.tsx                    -- Tenant rent status + history

apps/web/app/api/
├── cron/rent-reminders/route.ts     -- Vercel Cron handler
├── rent/route.ts                    -- GET: list rent periods (landlord)
├── rent/[id]/route.ts               -- PATCH: mark paid / update
├── rent/generate/route.ts           -- POST: generate rent periods for a month
├── tenant/rent/route.ts             -- GET: tenant's rent periods
├── notifications/route.ts           -- GET: list, PATCH: mark read
├── dashboard/rent-summary/route.ts  -- GET: aggregated rent stats
```

### New API Routes

```
GET    /api/rent                      -- List rent periods for landlord (filterable by month, property, status)
PATCH  /api/rent/[id]                 -- Update rent period (mark paid, add notes)
POST   /api/rent/generate             -- Generate rent periods for current/next month
GET    /api/tenant/rent               -- List rent periods for authenticated tenant
GET    /api/dashboard/rent-summary    -- Aggregated rent stats (overdue count, paid count, total collected)
GET    /api/notifications             -- List notifications for user
PATCH  /api/notifications             -- Mark notifications as read
POST   /api/cron/rent-reminders       -- Cron endpoint: check due dates, create notifications, update overdue
```

## Tech Approach

### Rent Period Generation

Rent periods are generated monthly, not computed on the fly. A `POST /api/rent/generate` endpoint (called manually by landlord or automatically by cron) creates one `rent_periods` row per active tenant for the specified month. This ensures:
- Historical data persists even if tenants leave or rent amounts change.
- Each row is a concrete record that can be marked paid independently.
- The `monthly_rent` on the properties table provides the default amount; the rent_periods row stores the actual amount owed (allows per-unit overrides).

**Generation logic:**
1. For each property owned by the landlord, find all active tenants.
2. For each tenant, check if a rent_periods row already exists for the target month.
3. If not, create one with `status = 'upcoming'`, `amount = property.monthly_rent`, `due_date = {year}-{month}-{property.rent_due_day}`.

### Due Date Configuration

Add a `rent_due_day` column (integer 1-28) to the `properties` table. Default: 1 (first of the month). Capped at 28 to avoid month-length edge cases (no Feb 29/30/31 issues).

### Status Lifecycle

```
upcoming  -->  due  -->  paid
                |
                v
             overdue  -->  paid
                |
                v
             partial  -->  paid
```

- **upcoming**: Created at generation time. Rent is not yet due.
- **due**: Cron flips `upcoming` to `due` when today = due_date.
- **overdue**: Cron flips `due` to `overdue` when today > due_date and status is still `due`.
- **partial**: Landlord manually marks partial payment (stores amount_paid < amount).
- **paid**: Landlord marks as paid (amount_paid >= amount).

### Cron Job

A Vercel Cron job (`vercel.json` config) runs `POST /api/cron/rent-reminders` daily at 6:00 AM UTC. The endpoint is protected by a `CRON_SECRET` environment variable that Vercel sends as an `Authorization: Bearer <secret>` header.

**Cron job steps:**
1. **Status transitions**: Query rent_periods where `status = 'upcoming'` and `due_date <= today` --> update to `'due'`. Query where `status = 'due'` and `due_date < today` --> update to `'overdue'`.
2. **Reminder notifications**: For `upcoming` periods where `due_date = today + 3 days` --> create "Rent due in 3 days" notification. For `due` periods where `due_date = today` --> create "Rent due today" notification. For `overdue` periods (first day overdue only, to avoid spam) --> create "Rent overdue" notification.
3. **Landlord summary**: For landlords with overdue tenants, create a single summary notification: "X tenants have overdue rent."

### Notifications

MVP notifications are **in-app only** -- a bell icon in the site header with an unread count badge and a dropdown/sheet listing recent notifications. Each notification has a `type`, `title`, `body`, `link` (to the relevant rent period or page), `read` boolean, and `recipient_id` (Clerk user ID).

Email/SMS delivery hooks into this same table later -- a separate worker reads unread notifications and dispatches via email/SMS based on user preferences. That is out of scope for this feature.

### Notification Preferences

Extend the existing `landlord_profiles` table with:
- `notify_rent_reminders` (boolean, default true) -- toggles all rent-related notifications for the landlord.

Extend the settings page Notifications tab with a new "Rent reminders" toggle.

Tenant notification preferences are simpler -- all tenants receive rent reminders by default. A future feature can add tenant-level preferences.

## UI Development Process

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design rent-schedule-page           # Phase 1: Plan rent table layout
/ui-build rent-schedule-page            # Phase 2: Build from plan
/ui-refine RentSchedulePage             # Phase 3: Polish

/ux-design rent-dashboard-card          # Phase 1: Plan dashboard summary
/ui-build rent-dashboard-card           # Phase 2: Build
/ui-refine RentSummaryCard              # Phase 3: Polish

/ux-design tenant-rent-view             # Phase 1: Plan tenant rent page
/ui-build tenant-rent-view              # Phase 2: Build
/ui-refine TenantRentPage               # Phase 3: Polish

/ux-design notification-bell            # Phase 1: Plan notification dropdown
/ui-build notification-bell             # Phase 2: Build
/ui-refine NotificationBell             # Phase 3: Polish
```

---

### Screen 1: Rent Schedule Page (Landlord)

**Route**: `/rent`
**Purpose**: Full view of all units with rent status for the current month. The landlord's primary tool for tracking who has paid and who hasn't.

#### Layout

- Mobile: Stacked cards (one per tenant/unit), sortable by status.
- Desktop: Data table with sortable columns, filterable by property and status.
- Top section: Month selector (prev/next arrows + month label), "Generate This Month" button (if periods don't exist yet), and filter controls.

#### Component Hierarchy

```
RentSchedulePage (apps/web/app/(landlord)/rent/page.tsx)
├── PageHeader ("Rent Schedule")
├── RentToolbar
│   ├── MonthSelector
│   │   ├── Button (ChevronLeft icon) -- previous month
│   │   ├── <span> "April 2026"
│   │   └── Button (ChevronRight icon) -- next month
│   ├── PropertyFilter
│   │   └── Select (filter by property, "All Properties" default)
│   ├── StatusFilter
│   │   └── Select (filter by status: All, Upcoming, Due, Overdue, Paid)
│   └── GenerateButton
│       └── Button ("Generate Rent Periods") -- shown only when no periods exist for selected month
├── RentStatusSummaryBar
│   ├── Badge "X Paid" (green)
│   ├── Badge "X Due" (yellow)
│   ├── Badge "X Overdue" (red)
│   └── Badge "$Y,YYY Collected"
├── Desktop: RentTable (hidden on mobile, visible lg+)
│   └── Table
│       ├── TableHeader
│       │   └── TableRow
│       │       ├── TableHead "Property"
│       │       ├── TableHead "Unit"
│       │       ├── TableHead "Tenant"
│       │       ├── TableHead "Amount"
│       │       ├── TableHead "Due Date"
│       │       ├── TableHead "Status"
│       │       └── TableHead "Actions"
│       └── TableBody
│           └── TableRow (per rent_period)
│               ├── TableCell -- property name
│               ├── TableCell -- unit number
│               ├── TableCell -- tenant name
│               ├── TableCell -- $amount
│               ├── TableCell -- formatted due date
│               ├── TableCell
│               │   └── Badge (variant by status: green=paid, yellow=due, red=overdue, gray=upcoming)
│               └── TableCell
│                   ├── Button "Mark Paid" (shown if not paid)
│                   └── Button "View" (link to /rent/[id])
├── Mobile: RentCardList (visible on mobile, hidden lg+)
│   └── RentCard (per rent_period)
│       └── Card
│           ├── CardHeader
│           │   ├── <div> tenant name + unit number
│           │   └── Badge (status)
│           ├── CardContent
│           │   ├── <p> property name
│           │   ├── <p> "$X,XXX due {date}"
│           │   └── <p> amount_paid if partial
│           └── CardContent (actions)
│               ├── Button "Mark Paid" (if not paid)
│               └── Button "Details" (link to /rent/[id])
└── EmptyState (when no periods for selected month)
    └── EmptyState icon=DollarSign
        title="No rent periods for {month}"
        description="Generate rent periods to start tracking."
        action={ label: "Generate Periods", onClick: handleGenerate }
```

#### shadcn/ui Components Used

| Component | Status | Use |
|-----------|--------|-----|
| `table` | Installed | Desktop rent data table |
| `card` | Installed | Mobile rent cards, summary bar |
| `badge` | Installed | Status indicators (paid/due/overdue/upcoming) |
| `button` | Installed | Actions (Mark Paid, Generate, navigation) |
| `select` | Installed | Property and status filters |
| `skeleton` | Installed | Loading state |
| `dialog` | Installed | "Mark Paid" confirmation dialog |
| `alert-dialog` | Installed | Confirm "Generate Periods" action |
| `input` | Installed | Amount paid input in mark-paid dialog |
| `label` | Installed | Form labels in dialogs |
| `textarea` | Installed | Notes field in mark-paid dialog |
| `separator` | Installed | Visual dividers |
| `tooltip` | Installed | Info tooltips on status badges |

#### User Flow

1. Landlord navigates to `/rent` from sidebar/bottom nav.
2. Current month is shown by default. A summary bar shows paid/due/overdue counts.
3. Landlord sees all tenants across all properties for this month.
4. If no periods exist yet, an empty state prompts "Generate Rent Periods."
5. Landlord clicks "Mark Paid" on a tenant row -- a dialog opens with amount (pre-filled with full amount), date paid (defaults to today), and optional notes.
6. On confirm, the row updates to "Paid" status with a green badge.
7. Landlord can filter by property or status to focus on overdue tenants.
8. Landlord can navigate to previous months to see history.

#### Responsive Behavior

- **Mobile (< lg)**: Card list. Each rent period is a card with tenant name, status badge, amount, and action buttons stacked vertically. Filters collapse into a single dropdown or sheet.
- **Desktop (lg+)**: Full data table. Filters are inline in the toolbar. Sortable columns.

---

### Screen 2: Rent Status Section on Dashboard

**Route**: `/dashboard` (existing page, new section)
**Purpose**: At-a-glance rent health alongside the existing maintenance stats.

#### Layout

A new `RentSummaryCard` component inserted on the dashboard between the `SectionCards` and `SpendChart`, or as additional cards in the existing `SectionCards` grid. Recommendation: Add a dedicated "Rent Overview" row below the existing stats grid to keep maintenance and rent metrics visually separated.

#### Component Hierarchy

```
DashboardPage (existing -- apps/web/app/(landlord)/dashboard/page.tsx)
├── PageHeader ("Dashboard")
├── OnboardingBanner (existing, conditional)
├── EmergencyAlertBanner (existing)
├── OverdueRentBanner (NEW -- similar pattern to EmergencyAlertBanner)
│   └── Card (border-amber-500, bg-amber-500/10)
│       ├── DollarSign icon (amber)
│       ├── <p> "X tenants have overdue rent"
│       └── Link Button "Review" --> /rent?status=overdue
├── SectionCards (existing -- emergencies, open requests, avg resolution, monthly spend)
├── RentSummaryCard (NEW)
│   └── Card
│       ├── CardHeader
│       │   ├── CardTitle "Rent Overview"
│       │   └── CardDescription "This month"
│       └── CardContent
│           └── <div> grid grid-cols-2 md:grid-cols-4 gap-4
│               ├── Stat: "Overdue" (count, red text if > 0)
│               ├── Stat: "Due Soon" (count, amber text)
│               ├── Stat: "Paid" (count, green text)
│               └── Stat: "Collected" ($total, bold)
├── SpendChart (existing)
└── Recent Requests (existing)
```

#### shadcn/ui Components Used

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | RentSummaryCard container, OverdueRentBanner |
| `badge` | Installed | Count indicators |
| `button` | Installed | "Review" link in banner |
| `separator` | Installed | Between sections |
| `skeleton` | Installed | Loading state |

#### User Flow

1. Landlord opens dashboard. If any tenants are overdue, the amber `OverdueRentBanner` appears below the emergency banner.
2. Below the existing stats row, the Rent Overview card shows 4 metrics: overdue count, due soon count, paid count, and total collected this month.
3. Clicking the banner "Review" button or any overdue count navigates to `/rent?status=overdue`.

---

### Screen 3: Tenant Rent View

**Route**: `/rent` (tenant layout)
**Purpose**: Tenant sees their own rent status, current amount due, and payment history.

#### Layout

- Mobile-first. Single column. Current month status is prominent at top.
- Below: scrollable history of past months.

#### Component Hierarchy

```
TenantRentPage (apps/web/app/(tenant)/rent/page.tsx)
├── PageHeader ("My Rent")
├── CurrentRentCard
│   └── Card (highlighted border if overdue)
│       ├── CardHeader
│       │   ├── Badge (status: "Due in 3 days" / "Due Today" / "Overdue" / "Paid")
│       │   └── CardTitle "$X,XXX"
│       ├── CardContent
│       │   ├── <p> "Due {formatted date}" (e.g., "Due April 1, 2026")
│       │   ├── <p> Property name + unit number
│       │   └── <p> amount_paid if partial: "Partial: $X,XXX of $X,XXX paid"
│       └── CardContent (info)
│           └── <p class="text-muted-foreground text-xs">
│               "Payment is recorded by your landlord. Contact them if you believe this is incorrect."
├── Separator
├── RentHistorySection
│   ├── <h2> "Payment History"
│   └── RentHistoryList
│       └── RentHistoryRow (per past rent_period, sorted newest first)
│           └── <div> flex items-center justify-between
│               ├── <div>
│               │   ├── <p> "March 2026" (month label)
│               │   └── <p class="text-xs text-muted-foreground"> paid_date or "Not paid"
│               ├── <p> "$X,XXX" (amount)
│               └── Badge (paid=green, overdue=red)
└── EmptyState (if no rent periods for this tenant)
    └── EmptyState icon=DollarSign
        title="No rent records yet"
        description="Your landlord hasn't set up rent tracking for your unit yet."
```

#### shadcn/ui Components Used

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Current rent card |
| `badge` | Installed | Status badges |
| `separator` | Installed | Between current and history |
| `skeleton` | Installed | Loading state |
| `scroll-area` | Installed | History list on mobile |

#### User Flow

1. Tenant navigates to `/rent` from bottom nav.
2. The top card shows current month rent status prominently -- amount, due date, status badge.
3. If overdue, the card has a red/amber border and the badge says "Overdue."
4. Below, a history section shows past months with status and amounts.
5. Tenants cannot mark themselves as paid -- only landlords can record payments.
6. A note explains that payment recording is done by the landlord.

#### Responsive Behavior

- Fully mobile-optimized. Single column at all breakpoints.
- On desktop, content is max-width constrained (e.g., `max-w-2xl mx-auto`) to avoid overly wide cards.

---

### Screen 4: Notification Preferences (Settings Extension)

**Route**: `/settings` (existing page, extended)
**Purpose**: Add rent reminder toggle to the existing Notifications tab.

#### Component Hierarchy (addition to existing SettingsPage)

```
SettingsPage (existing -- apps/web/app/(landlord)/settings/page.tsx)
├── Tabs (existing)
│   ├── "AI Preferences" tab (existing, unchanged)
│   └── "Notifications" tab (existing, extended)
│       └── Card (existing)
│           ├── Switch: Emergency alerts (existing)
│           ├── Switch: All request alerts (existing)
│           ├── Separator (NEW)
│           ├── SectionLabel "Rent" (NEW)
│           │   └── <p class="text-xs text-muted-foreground"> "Notifications about rent due dates and overdue payments"
│           ├── Switch: Rent reminders (NEW)  -- notify_rent_reminders
│           │   ├── label: "Rent reminders"
│           │   └── description: "Get notified about upcoming and overdue rent"
│           └── Switch: Overdue summary (NEW) -- notify_rent_overdue_summary
│               ├── label: "Daily overdue summary"
│               └── description: "Receive a daily summary of overdue tenants"
└── Save button (existing)
```

#### shadcn/ui Components Used

All already installed: `switch`, `separator`, `card`, `tabs`.

#### User Flow

1. Landlord navigates to Settings > Notifications tab.
2. Existing toggles (Emergency alerts, All request alerts) are unchanged.
3. Below a separator, a "Rent" section appears with two new toggles.
4. Landlord toggles rent reminders on/off. Changes are saved with the existing Save button.

---

### Screen 5: Overdue Alert Banner

**Route**: `/dashboard` (existing page, new component)
**Purpose**: Prominent alert when tenants have overdue rent, styled like the existing `EmergencyAlertBanner`.

#### Component Hierarchy

```
OverdueRentBanner (components/dashboard/overdue-rent-banner.tsx)
└── Card (role="alert", aria-live="polite")
    ├── className: "border-amber-500 bg-amber-500/10 flex flex-row items-center gap-3 p-4"
    ├── DollarSign icon (className: "size-5 shrink-0 text-amber-600")
    ├── <p> "X tenant(s) have overdue rent" (className: "flex-1 text-sm font-medium text-amber-700")
    └── Link Button (variant: outline, className: "border-amber-500 text-amber-700 hover:bg-amber-500/20")
        ├── href: "/rent?status=overdue"
        └── label: "Review Now"
```

#### shadcn/ui Components Used

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Banner container |
| `button` | Installed | "Review Now" action |

#### User Flow

1. Dashboard loads. If `rent_summary.overdue_count > 0`, the banner renders.
2. Banner appears below the `EmergencyAlertBanner` (emergencies take priority).
3. Clicking "Review Now" navigates to `/rent?status=overdue`.
4. Banner disappears when no tenants are overdue.

---

### Screen 6: Notification Bell (Site Header)

**Route**: All pages (added to `SiteHeader` component)
**Purpose**: In-app notification indicator with unread count and dropdown.

#### Component Hierarchy

```
SiteHeader (existing -- components/layout/site-header.tsx, extended)
├── ... existing content ...
├── NotificationBell (NEW -- components/layout/notification-bell.tsx)
│   ├── Button (variant: ghost, size: icon)
│   │   ├── Bell icon (lucide-react)
│   │   └── UnreadBadge (conditional)
│   │       └── <span> absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-[10px] text-white
│   │           └── {unreadCount} (max display "9+")
│   └── Sheet (or Drawer on mobile)
│       ├── SheetHeader
│       │   ├── SheetTitle "Notifications"
│       │   └── Button "Mark all read" (text variant, small)
│       ├── SheetContent
│       │   └── ScrollArea
│       │       └── NotificationItem (per notification)
│       │           └── <div> flex gap-3 p-3 rounded-lg (bg-muted/50 if unread)
│       │               ├── Icon (type-dependent: DollarSign for rent, Wrench for maintenance)
│       │               ├── <div> flex-1
│       │               │   ├── <p class="text-sm font-medium"> title
│       │               │   ├── <p class="text-xs text-muted-foreground"> body
│       │               │   └── <p class="text-xs text-muted-foreground"> relative time ("2h ago")
│       │               └── UnreadDot (conditional)
│       │                   └── <span> size-2 rounded-full bg-primary
│       └── SheetFooter (if many notifications)
│           └── Button "View All" (future: /notifications page)
└── ... existing content ...
```

#### shadcn/ui Components Used

| Component | Status | Use |
|-----------|--------|-----|
| `button` | Installed | Bell trigger |
| `sheet` | Installed | Notification panel (slides from right) |
| `scroll-area` | Installed | Scrollable notification list |
| `separator` | Installed | Between notification items |
| `badge` | Installed | Unread count |
| `skeleton` | Installed | Loading state |

#### User Flow

1. User sees bell icon in site header. If unread notifications exist, a red badge shows the count.
2. Clicking the bell opens a Sheet from the right.
3. Unread notifications have a highlighted background and a blue dot.
4. Clicking a notification navigates to the relevant page (e.g., `/rent/[id]`) and marks it as read.
5. "Mark all read" button clears all unread indicators.

## Data Model

### New Table: `rent_periods`

```sql
create table rent_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants not null,
  property_id uuid references properties not null,
  landlord_id text not null,                    -- Clerk user ID (denormalized for query efficiency)

  -- Period
  period_month date not null,                   -- First day of the month (e.g., 2026-04-01)
  due_date date not null,                       -- Actual due date (e.g., 2026-04-01)

  -- Amounts
  amount decimal(10,2) not null,                -- Rent owed
  amount_paid decimal(10,2) not null default 0, -- Amount recorded as paid

  -- Status
  status text not null default 'upcoming',
    -- 'upcoming' | 'due' | 'overdue' | 'partial' | 'paid'

  -- Payment tracking (manual for MVP)
  paid_date date,                               -- Date landlord recorded payment
  payment_notes text,                           -- Landlord notes ("Paid via Venmo", etc.)

  -- Future: payment integration hook
  -- payment_id uuid,                           -- FK to payments table (P2-004)
  -- payment_method text,                       -- 'manual' | 'stripe' | 'ach' (P2-004)

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_rent_periods_tenant on rent_periods(tenant_id);
create index idx_rent_periods_landlord on rent_periods(landlord_id);
create index idx_rent_periods_property on rent_periods(property_id);
create index idx_rent_periods_status on rent_periods(status);
create index idx_rent_periods_due_date on rent_periods(due_date);
create unique index idx_rent_periods_unique on rent_periods(tenant_id, period_month);

-- Reuse existing update_updated_at() trigger function
create trigger set_updated_at_rent_periods
  before update on rent_periods
  for each row execute function update_updated_at();
```

### New Table: `notifications`

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id text not null,                    -- Clerk user ID
  type text not null,                            -- 'rent_upcoming' | 'rent_due' | 'rent_overdue' | 'rent_overdue_summary'
  title text not null,                           -- "Rent due in 3 days"
  body text,                                     -- "Your rent of $1,500 at 123 Main St is due April 1."
  link text,                                     -- "/rent/uuid" or "/rent?status=overdue"
  read boolean not null default false,
  related_id uuid,                               -- FK to rent_periods.id (or other entity)
  created_at timestamptz default now()
);

create index idx_notifications_recipient on notifications(recipient_id);
create index idx_notifications_unread on notifications(recipient_id, read) where read = false;
create index idx_notifications_created on notifications(created_at desc);
```

### Modify Existing Table: `properties`

```sql
alter table properties
  add column rent_due_day integer not null default 1
    constraint chk_rent_due_day check (rent_due_day >= 1 and rent_due_day <= 28);
```

### Modify Existing Table: `landlord_profiles`

```sql
alter table landlord_profiles
  add column notify_rent_reminders boolean not null default true,
  add column notify_rent_overdue_summary boolean not null default true;
```

### TypeScript Types

```typescript
export type RentStatus = 'upcoming' | 'due' | 'overdue' | 'partial' | 'paid';

export interface RentPeriod {
  id: string;
  tenant_id: string;
  property_id: string;
  landlord_id: string;
  period_month: string;          // "2026-04-01"
  due_date: string;              // "2026-04-01"
  amount: number;
  amount_paid: number;
  status: RentStatus;
  paid_date: string | null;
  payment_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations (optional, populated by API)
  tenants?: Pick<Tenant, 'id' | 'name' | 'email' | 'unit_number'>;
  properties?: Pick<Property, 'id' | 'name' | 'address'>;
}

export interface RentSummary {
  overdue_count: number;
  due_count: number;
  paid_count: number;
  upcoming_count: number;
  total_owed: number;
  total_collected: number;
}

export type NotificationType =
  | 'rent_upcoming'
  | 'rent_due'
  | 'rent_overdue'
  | 'rent_overdue_summary';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  related_id: string | null;
  created_at: string;
}
```

## Integration Points

### 1. Dashboard (`/dashboard`)

- **New data fetch**: Add `GET /api/dashboard/rent-summary` to the existing `Promise.all` in the dashboard page.
- **OverdueRentBanner**: Renders below `EmergencyAlertBanner` when `overdue_count > 0`.
- **RentSummaryCard**: New card below the existing stats grid showing overdue/due/paid/collected.

### 2. Navigation (Sidebar + Bottom Nav)

- **New nav item**: Add "Rent" (icon: `DollarSign` from lucide-react) to both `navItems` arrays in `app-sidebar.tsx` and `landlord-bottom-nav.tsx`. Position it after "Properties" and before "Settings."
- **Tenant nav**: Add "Rent" (icon: `DollarSign`) to the tenant bottom nav in `(tenant)/layout.tsx`. Position between "Submit" and "Requests."

### 3. Settings Page (`/settings`)

- **Notifications tab**: Add `notify_rent_reminders` and `notify_rent_overdue_summary` toggles.
- **Profile API**: Extend the existing `PUT /api/settings/profile` to accept and save the two new boolean fields.
- **Types**: Extend `LandlordProfile` interface with the two new fields.

### 4. Site Header

- **NotificationBell**: Add to `SiteHeader` component (both landlord and tenant layouts).
- **Polling**: Fetch `GET /api/notifications?unread=true&limit=1` on mount to get unread count. Full list fetched when bell is clicked. Consider Supabase Realtime subscription for push updates in a future iteration.

### 5. Properties Page / Edit

- **rent_due_day**: Add a "Rent Due Day" field to the property create/edit forms. A number input or select (1-28) with default 1.
- **API**: Extend `POST /api/properties` and `PUT /api/properties/[id]` to accept `rent_due_day`.

### 6. Vercel Configuration

- **vercel.json**: Add cron configuration:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/rent-reminders",
        "schedule": "0 6 * * *"
      }
    ]
  }
  ```
- **Environment variable**: Add `CRON_SECRET` to Vercel environment variables.

### 7. Supabase RLS (Future)

Rent periods should be protected by Row Level Security:
- Landlords can read/write rent_periods where `landlord_id` matches their Clerk ID.
- Tenants can read rent_periods where `tenant_id` matches their linked tenant record.
- Notifications: users can only read/update their own notifications.

RLS is not yet enabled on any tables in the current codebase (no RLS policies in migrations). When RLS is added project-wide, rent_periods and notifications policies should follow the same pattern.

## Manual Testing Checklist

### Rent Period Generation

- [ ] Navigating to `/rent` with no periods shows empty state with "Generate Rent Periods" button.
- [ ] Clicking "Generate Rent Periods" creates one row per active tenant for the current month.
- [ ] Generated periods use `monthly_rent` from the property as the amount.
- [ ] Generated periods use `rent_due_day` from the property for the due date.
- [ ] Generating again for the same month does not create duplicates.
- [ ] Tenants without a property or without a `monthly_rent` value are handled gracefully.

### Rent Schedule Page (Landlord)

- [ ] `/rent` shows all rent periods for the current month.
- [ ] Month navigation (prev/next) loads correct month data.
- [ ] Property filter narrows results to selected property.
- [ ] Status filter narrows results to selected status.
- [ ] Summary bar shows correct counts (paid, due, overdue) and total collected.
- [ ] Desktop view shows data table; mobile view shows cards.
- [ ] "Mark Paid" button opens dialog with pre-filled amount and today's date.
- [ ] Confirming "Mark Paid" updates status to "paid" and refreshes the view.
- [ ] Partial payment (entering less than full amount) sets status to "partial."
- [ ] Click on a row/card navigates to `/rent/[id]` detail page.

### Rent Status on Dashboard

- [ ] Dashboard shows `RentSummaryCard` with correct counts.
- [ ] `OverdueRentBanner` appears when overdue_count > 0.
- [ ] `OverdueRentBanner` hidden when no overdue tenants.
- [ ] Clicking banner "Review Now" navigates to `/rent?status=overdue`.
- [ ] Dashboard loads correctly when no rent periods exist (card shows zeros).

### Tenant Rent View

- [ ] `/rent` (tenant) shows current month rent status card.
- [ ] Status badge correctly reflects upcoming/due/overdue/paid.
- [ ] Overdue status shows red/amber card border.
- [ ] Payment history section shows past months sorted newest first.
- [ ] Tenant cannot mark their own rent as paid (no action buttons).
- [ ] Empty state shown when no rent periods exist for this tenant.

### Notification Preferences

- [ ] Settings > Notifications tab shows new "Rent" section.
- [ ] "Rent reminders" toggle saves to `notify_rent_reminders`.
- [ ] "Daily overdue summary" toggle saves to `notify_rent_overdue_summary`.
- [ ] Toggles reflect saved state on page reload.

### Overdue Alert Banner

- [ ] Banner uses amber color scheme (distinct from red emergency banner).
- [ ] Banner shows correct overdue count.
- [ ] Banner has `role="alert"` and `aria-live="polite"` for accessibility.
- [ ] "Review Now" link navigates correctly.

### Notification Bell

- [ ] Bell icon appears in site header.
- [ ] Unread badge shows correct count (caps at "9+").
- [ ] Clicking bell opens Sheet with notification list.
- [ ] Unread notifications have highlighted background.
- [ ] Clicking a notification navigates to linked page and marks it as read.
- [ ] "Mark all read" clears all unread indicators.
- [ ] Empty state shown when no notifications exist.

### Cron Job

- [ ] `POST /api/cron/rent-reminders` rejects requests without valid `CRON_SECRET`.
- [ ] Cron transitions `upcoming` -> `due` when due_date = today.
- [ ] Cron transitions `due` -> `overdue` when due_date < today.
- [ ] Cron creates "due in 3 days" notification for upcoming periods 3 days out.
- [ ] Cron creates "due today" notification for due periods.
- [ ] Cron creates "overdue" notification for newly overdue periods.
- [ ] Cron creates landlord summary notification when overdue tenants exist.
- [ ] Cron respects `notify_rent_reminders = false` (skips notification creation).
- [ ] Cron does not create duplicate notifications for the same period on subsequent runs.

### Edge Cases

- [ ] Property with no tenants -- generate periods does nothing.
- [ ] Property with `monthly_rent = null` -- generate periods skips or uses $0.
- [ ] Tenant added mid-month -- can generate period for current month.
- [ ] Tenant removed -- existing rent periods for that tenant remain (historical).
- [ ] Rent due day = 28 on February -- works correctly.
- [ ] Multiple properties with different due days -- each period has correct due date.
- [ ] Landlord with 0 properties -- rent page shows empty state, no errors.
- [ ] Navigating to future months -- shows empty state or allows pre-generation.
- [ ] Marking paid with amount > owed -- allowed (overpayment recorded).

## Tasks

Tasks to be created in `backlog/`:

| # | Tier | Title | Depends On |
|---|------|-------|------------|
| 01 | Haiku | Database migration -- rent_periods, notifications tables + properties.rent_due_day + landlord_profiles notification columns | -- |
| 02 | Haiku | TypeScript types -- RentPeriod, RentSummary, Notification, NotificationType + extend LandlordProfile | 01 |
| 03 | Sonnet | Rent period API routes -- GET /api/rent, PATCH /api/rent/[id], POST /api/rent/generate | 01, 02 |
| 04 | Sonnet | Tenant rent API route -- GET /api/tenant/rent | 01, 02 |
| 05 | Sonnet | Dashboard rent summary API -- GET /api/dashboard/rent-summary | 01, 02 |
| 06 | Sonnet | Notifications API routes -- GET /api/notifications, PATCH /api/notifications | 01, 02 |
| 07 | Sonnet | Cron job endpoint -- POST /api/cron/rent-reminders + vercel.json config | 01, 02, 06 |
| 08 | Sonnet | Extend properties API -- add rent_due_day to create/update routes + property forms | 01 |
| 09 | Sonnet | Extend settings API + profile -- add notify_rent_reminders, notify_rent_overdue_summary fields | 01 |
| 10 | Opus | Build Rent Schedule page (landlord) -- table/card views, toolbar, filters, mark-paid dialog | 03 |
| 11 | Opus | Build Rent Summary Card + Overdue Banner for dashboard | 05 |
| 12 | Opus | Build Tenant Rent View page -- current status card + payment history | 04 |
| 13 | Opus | Build Notification Bell component -- bell icon, sheet, notification list | 06 |
| 14 | Sonnet | Add "Rent" nav item to sidebar + bottom nav (landlord + tenant) | -- |
| 15 | Sonnet | Extend Settings Notifications tab with rent toggles | 09 |
| 16 | Haiku | Update docs/endpoints.md with all new routes and pages | All |

**Tier breakdown**: 3 Haiku, 9 Sonnet, 4 Opus
**Dependency graph**: 01 is the foundation (migration) --> 02 (types) --> API routes (03-09, parallelizable) --> UI tasks (10-15, depend on their respective APIs) --> 16 (docs, last).

```
01 (migration)
├── 02 (types)
│   ├── 03 (rent API)       --> 10 (rent schedule page)
│   ├── 04 (tenant rent API) --> 12 (tenant rent view)
│   ├── 05 (rent summary API) --> 11 (dashboard card + banner)
│   ├── 06 (notifications API)
│   │   ├── 07 (cron job)
│   │   └── 13 (notification bell)
│   └── 09 (settings extension) --> 15 (settings UI)
├── 08 (properties rent_due_day)
└── 14 (nav items -- no API dependency)

16 (docs -- after everything)
```

## Open Questions

1. **Rent period auto-generation vs. manual?** -- Recommendation: Hybrid. Cron auto-generates periods for the upcoming month on the 25th of each month (or on first login after the 25th). Landlord can also manually trigger generation. This avoids landlords forgetting and having an empty rent page on the 1st.

2. **Grace period for overdue?** -- Should there be a configurable grace period (e.g., 3 days after due date before marking overdue)? Recommendation: Not for MVP. The status transition is strict (overdue on day after due_date). A grace period setting can be added to landlord_profiles in a future iteration.

3. **Per-unit rent amounts?** -- Currently `monthly_rent` is on the `properties` table (one value for the whole property). Multi-unit properties may have different rents per unit. Recommendation: For MVP, use the property-level rent for all units. Add a `monthly_rent` override column to the `tenants` table in a fast-follow if needed.

4. **Notification delivery beyond in-app?** -- Email and SMS delivery are deferred to the `/notify` skill buildout. The notifications table is designed to support this -- a delivery worker would read notifications and dispatch based on user preferences. Should we stub the email integration now? Recommendation: No. Build the in-app notification system first, verify it works, then layer on delivery channels.

5. **Supabase Realtime for notifications?** -- Should the notification bell use Supabase Realtime subscriptions for instant updates instead of polling? Recommendation: Defer. Polling on page load is sufficient for MVP. Realtime can be added when the notification system matures and delivery latency matters.

6. **Bottom nav overflow (mobile)?** -- Adding "Rent" makes the landlord bottom nav 6 items (Dashboard, Requests, Properties, Rent, Vendors, Settings). This may be crowded on small screens. Options: (a) Keep 6 items with smaller icons, (b) use a "More" menu for Settings/Vendors, (c) move Rent into the Dashboard as a sub-page. Recommendation: (b) -- collapse Vendors and Settings into a "More" dropdown when all 6 items are present. But this is a UX judgment call to validate during the UI build phase.

7. **Tenant notification preferences?** -- MVP sends all tenants rent reminders by default. Should tenants have a way to opt out? Recommendation: Not for MVP. Rent reminders are a core value prop. Add tenant notification preferences in Phase 3 when the notification system is more mature.
