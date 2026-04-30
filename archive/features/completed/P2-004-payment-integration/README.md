# Feature: Payment Integration

**ID**: P2-004
**Ticket**: T-007
**Phase**: 2

## TL;DR

Add rent collection from tenants (via Stripe), payment history tracking, a landlord payment dashboard showing who paid and who's late, vendor payment tracking for maintenance costs, and a monthly financial summary (P&L). This turns "The Ledger" from a spend-only chart into a complete money-in/money-out picture.

## Summary

Today the dashboard shows "Maintenance Spend vs. Monthly Rent" as a bar chart, but "rent" is just the static `monthly_rent` column on the `properties` table. There is no way for tenants to actually pay rent through Liz, no record of who paid or when, and no way to track vendor payments beyond `actual_cost` on individual maintenance requests.

This feature adds five capabilities:

1. **Tenant rent payment** — tenants see their balance, due date, and a "Pay Rent" button that takes them through Stripe Checkout. Payments are recorded in a new `payments` table.
2. **Landlord payment dashboard** — a table/grid of all units with payment status (paid, pending, overdue). Filterable by property, with totals.
3. **Payment receipts** — individual payment records with downloadable PDF receipts.
4. **Vendor payment tracking** — log payments made to vendors for maintenance work. Manual entry for Phase 2 (no vendor payout automation).
5. **Financial summary** — monthly P&L view: rent collected vs. maintenance spent vs. net income.

### Why Stripe (not Clerk Billing)

Clerk Billing handles SaaS subscription payments (landlord pays Liz). Rent payment is B2B2C: a tenant pays a landlord through Liz. This requires Stripe Connect, which lets the platform (Liz) facilitate payments between two parties and optionally take a platform fee.

### Scope Boundaries

- **In scope**: rent payment via Stripe Checkout, payment recording, landlord dashboard, vendor payment logging (manual), financial summary, receipts.
- **Out of scope**: ACH/bank transfer (future — Stripe supports it but adds compliance complexity), automatic late fees, partial payments, recurring auto-pay (Phase 3), vendor payout via Stripe (Phase 3), security deposit handling, lease management.

## User Stories

### Tenant
- As a tenant, I want to see my current rent balance and due date so I know what I owe.
- As a tenant, I want to pay my rent online with a credit/debit card so I don't have to mail a check.
- As a tenant, I want to see my payment history so I can track what I've paid.
- As a tenant, I want to download a receipt for each payment so I have proof of payment.

### Landlord
- As a landlord, I want to see which tenants have paid this month and which haven't so I can follow up on late payments.
- As a landlord, I want to filter payment status by property so I can focus on one building at a time.
- As a landlord, I want to see total rent collected vs. expected rent so I know my collection rate.
- As a landlord, I want to log payments I've made to vendors so I can track maintenance costs.
- As a landlord, I want a monthly financial summary showing rent collected minus maintenance costs so I can see net income.
- As a landlord, I want to set up my Stripe account through Liz so tenants can pay me directly.

## Architecture

### Payment Flow

```
Tenant opens /pay
  │
  ├── Sees: current balance, due date, payment history
  │
  └── Clicks "Pay Rent"
        │
        ├── POST /api/payments/checkout
        │     │
        │     ├── Creates Stripe Checkout Session
        │     │   (amount = monthly_rent, metadata = tenant_id, property_id, period)
        │     │
        │     └── Returns checkout URL → tenant redirected to Stripe
        │
        └── Stripe hosted checkout
              │
              ├── Success → redirect to /pay?success=true
              │     └── Stripe fires webhook → checkout.session.completed
              │           │
              │           └── POST /api/webhooks/stripe
              │                 ├── Create payment record (status: completed)
              │                 └── Update payment_periods row (status: paid)
              │
              └── Cancel → redirect to /pay?canceled=true
```

### Stripe Connect Architecture

```
Liz Platform (Stripe Connect)
  │
  ├── Platform Account (Liz's Stripe account)
  │     └── Handles: Checkout Sessions, webhooks, fee collection
  │
  └── Connected Accounts (one per landlord)
        └── Landlord onboards via Stripe Connect Express
              │
              ├── GET /api/payments/connect/onboard
              │     └── Creates Stripe Account Link → redirect to Stripe
              │
              ├── Stripe hosted onboarding (bank account, identity, tax)
              │     └── Redirect back to /dashboard/payments?setup=complete
              │
              └── Tenant payments go directly to landlord's connected account
                    └── Platform takes X% fee (configurable, 0% for beta)
```

### Vendor Payment Flow (Manual)

```
Landlord opens /dashboard/payments → "Vendor Payments" tab
  │
  ├── Sees: list of vendor payments, total spent
  │
  └── Clicks "Log Payment"
        │
        ├── Dialog: select vendor, amount, date, description, optional request link
        │
        └── POST /api/payments/vendor
              └── Creates vendor_payment record
```

### New Route Group

```
apps/web/app/(tenant)/
├── pay/page.tsx                          — Tenant payment portal

apps/web/app/(landlord)/dashboard/
├── payments/page.tsx                     — Landlord payment dashboard

apps/web/app/api/
├── payments/
│   ├── checkout/route.ts                 — Create Stripe Checkout Session
│   ├── connect/
│   │   ├── onboard/route.ts              — Start Stripe Connect onboarding
│   │   └── status/route.ts              — Check connected account status
│   ├── vendor/route.ts                   — CRUD vendor payments
│   ├── [id]/route.ts                     — Get single payment / receipt data
│   └── summary/route.ts                  — Financial summary (P&L data)
├── webhooks/
│   └── stripe/route.ts                   — Stripe webhook handler
```

### New API Routes

```
POST   /api/payments/checkout              — Create Stripe Checkout Session for rent
GET    /api/payments/connect/onboard       — Generate Stripe Connect onboarding link
GET    /api/payments/connect/status        — Check if landlord has active connected account
GET    /api/payments                       — List payments (tenant: own; landlord: all)
GET    /api/payments/[id]                  — Single payment detail + receipt data
POST   /api/payments/vendor               — Log a vendor payment
GET    /api/payments/vendor               — List vendor payments
GET    /api/payments/summary              — Monthly P&L summary
POST   /api/webhooks/stripe               — Stripe webhook (checkout.session.completed, etc.)
```

## Tech Approach

### Stripe Connect (Express)

**Recommendation: Stripe Connect Express accounts.**

- **Standard** accounts give landlords full Stripe Dashboard access — overkill and confusing for small landlords.
- **Express** accounts provide a simplified onboarding flow hosted by Stripe (identity verification, bank account setup) and a lightweight Express Dashboard for payouts. Liz controls the experience.
- **Custom** accounts offer full control but require Liz to build identity verification and payout UIs — too much work for Phase 2.

Express is the right balance: Stripe handles compliance (KYC/KYB), landlords get paid directly, and Liz can take an optional platform fee.

### Payment Processing

1. **Stripe Checkout (hosted)** — not embedded. Reduces PCI scope to zero. Tenant clicks "Pay Rent" and is redirected to Stripe's hosted page. After payment, redirected back to `/pay?success=true`.
2. **Webhooks for confirmation** — never trust the redirect. The `/api/webhooks/stripe` endpoint listens for `checkout.session.completed` to create the payment record. This handles edge cases (browser closed, redirect failed).
3. **Idempotency** — each payment period (tenant + month) has a unique `payment_periods` row. The checkout session includes this ID in metadata. Webhook handler checks for duplicate before creating a payment record.

### Rent Period Generation

A background job or on-demand function generates `payment_periods` rows at the start of each month:
- For each active tenant with a `property.monthly_rent > 0`, create a `payment_periods` row with `status: pending`, `due_date: 1st of month` (configurable per property later).
- For MVP, generate periods on-demand when tenant visits `/pay` or landlord visits `/dashboard/payments` (no cron needed).

### Vendor Payments (Manual Entry)

No Stripe integration for vendor payments in Phase 2. Landlords manually log payments:
- Amount, date, vendor (dropdown), optional link to a maintenance request.
- This data feeds into the financial summary.
- Phase 3 can add vendor payout via Stripe Connect.

### Receipt Generation

PDF receipts generated server-side using a lightweight library (e.g., `@react-pdf/renderer` or `jspdf`). Stored as downloadable links, not in Supabase Storage (generated on demand from payment data).

### Environment Variables

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...    # For Connect onboarding
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## UI Development Process

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design tenant-payment-portal           # Phase 1: Plan tenant /pay page
/ui-build tenant-payment-portal            # Phase 2: Build
/ui-refine TenantPaymentPortal             # Phase 3: Polish

/ux-design landlord-payment-dashboard      # Phase 1: Plan /dashboard/payments
/ui-build landlord-payment-dashboard       # Phase 2: Build
/ui-refine PaymentDashboard                # Phase 3: Polish

/ux-design financial-summary               # Phase 1: Plan P&L view
/ui-build financial-summary                # Phase 2: Build
/ui-refine FinancialSummary                # Phase 3: Polish
```

### Screen 1: Tenant Payment Portal (`/pay`)

**Purpose**: Tenant sees what they owe, pays rent, and reviews payment history.

**Layout**: Single-column, mobile-first. No sidebar (tenant layout). Centered content, max-w-2xl.

**User Flow**:
1. Tenant navigates to `/pay` (linked from tenant nav).
2. Sees a prominent card showing: property name, unit number, amount due, due date, and a large "Pay Rent" button.
3. If no balance due (already paid this month), the card shows a green check with "You're all set for [Month]."
4. Below the payment card: a payment history list showing past payments with date, amount, status, and a "Receipt" download link.
5. Clicking "Pay Rent" calls `POST /api/payments/checkout`, which returns a Stripe Checkout URL. Tenant is redirected.
6. After payment, tenant returns to `/pay?success=true` and sees a success toast + updated status.

**Component Hierarchy**:

```
PayPage (app/(tenant)/pay/page.tsx)
├── PageHeader ("Rent Payment")
├── CurrentBalanceCard
│   ├── Property name + unit number (from tenant's linked property)
│   ├── Amount: $X,XXX.XX
│   ├── Due: Month Day, Year
│   ├── Status badge (pending | paid | overdue)
│   └── Button: "Pay Rent" (primary, large) — or "Paid" (disabled, green)
├── PaymentHistorySection
│   ├── SectionHeader ("Payment History")
│   └── PaymentHistoryList
│       └── PaymentHistoryItem (repeating)
│           ├── Date
│           ├── Amount
│           ├── Status badge
│           └── "Receipt" link (opens /pay/receipt/[id] or downloads PDF)
└── SuccessToast (shown on ?success=true redirect)
```

**shadcn Components**:

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Balance card, history items |
| `button` | Installed | Pay button, receipt download |
| `badge` | Installed | Payment status (paid/pending/overdue) |
| `separator` | Installed | Between history items |
| `skeleton` | Installed | Loading state |
| `sonner` (toast) | Installed | Success/error feedback |
| `scroll-area` | Installed | Long payment history list |

**Responsive Strategy**:
- Mobile (< 640px): Full-width card, stacked layout. Pay button spans full width.
- Tablet/Desktop (>= 640px): Centered max-w-2xl. Card has comfortable padding.
- The payment card is the hero element — large, prominent, high contrast for amount due.

### Screen 2: Landlord Payment Dashboard (`/dashboard/payments`)

**Purpose**: Landlord sees rent collection status across all properties, vendor payments, and financial summary.

**Layout**: Full-width within the existing landlord dashboard sidebar layout. Tabs for different views.

**User Flow**:
1. Landlord navigates to `/dashboard/payments` (new sidebar nav item, icon: `CreditCard` or `DollarSign`).
2. Sees three tabs: **Rent Collection**, **Vendor Payments**, **Financial Summary**.
3. **Rent Collection tab** (default): Grid/table showing all tenants with columns: Tenant, Property, Unit, Amount, Due Date, Status, Actions. Filterable by property (dropdown) and status (all/paid/pending/overdue). Summary cards at top: Total Expected, Total Collected, Collection Rate %.
4. **Vendor Payments tab**: Table of vendor payments with columns: Date, Vendor, Amount, Description, Linked Request. "Log Payment" button opens a dialog.
5. **Financial Summary tab**: Monthly P&L cards showing Rent Collected, Maintenance Spent, Net Income. Bar chart (extending existing `SpendChart` pattern) showing monthly trend.
6. If Stripe Connect is not set up, show a prominent setup banner: "Connect your bank account to start collecting rent" with a "Set Up Payments" button.

**Component Hierarchy**:

```
PaymentDashboardPage (app/(landlord)/dashboard/payments/page.tsx)
├── PageHeader ("Payments")
├── StripeConnectBanner (conditional — shown if no connected account)
│   ├── Icon + "Set up your payment account to collect rent"
│   └── Button: "Connect with Stripe" → GET /api/payments/connect/onboard
├── Tabs
│   ├── Tab: "Rent Collection"
│   │   ├── SummaryCards (grid of 3)
│   │   │   ├── Card: Total Expected ($X,XXX)
│   │   │   ├── Card: Total Collected ($X,XXX)
│   │   │   └── Card: Collection Rate (XX%)
│   │   ├── FiltersBar
│   │   │   ├── Select: Property (all / specific property)
│   │   │   └── Select: Status (all / paid / pending / overdue)
│   │   └── RentCollectionTable
│   │       └── Table rows (one per tenant per period)
│   │           ├── Tenant name
│   │           ├── Property name
│   │           ├── Unit number
│   │           ├── Amount ($X,XXX.XX)
│   │           ├── Due date
│   │           ├── Status badge (paid: green, pending: yellow, overdue: red)
│   │           └── Actions: "View Receipt" (if paid) | "Send Reminder" (if overdue, future)
│   │
│   ├── Tab: "Vendor Payments"
│   │   ├── VendorPaymentSummary
│   │   │   └── Card: Total Vendor Spend ($X,XXX)
│   │   ├── Button: "Log Payment" → opens LogVendorPaymentDialog
│   │   └── VendorPaymentTable
│   │       └── Table rows
│   │           ├── Date
│   │           ├── Vendor name
│   │           ├── Amount
│   │           ├── Description
│   │           └── Linked request (clickable link to /requests/[id], or "—")
│   │
│   └── Tab: "Financial Summary"
│       ├── PeriodSelector (month/year picker)
│       ├── PLSummaryCards (grid of 3)
│       │   ├── Card: Rent Collected (green)
│       │   ├── Card: Maintenance Costs (red)
│       │   └── Card: Net Income (blue, bold)
│       ├── MonthlyTrendChart (extends SpendChart pattern — stacked bar: rent vs. costs)
│       └── PropertyBreakdownTable
│           └── Table rows (one per property)
│               ├── Property name
│               ├── Rent collected
│               ├── Maintenance costs
│               └── Net income
```

**shadcn Components**:

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Summary cards, P&L cards |
| `tabs` | Installed | Rent / Vendor / Summary views |
| `table` | Installed | Rent collection grid, vendor payments, property breakdown |
| `badge` | Installed | Payment status |
| `select` | Installed | Property filter, status filter, period selector |
| `button` | Installed | Log payment, setup Stripe, actions |
| `dialog` | Installed | Log vendor payment form |
| `input` | Installed | Dialog form fields |
| `label` | Installed | Dialog form labels |
| `chart` | Installed | Monthly trend chart (Recharts) |
| `skeleton` | Installed | Loading states |
| `dropdown-menu` | Installed | Row actions |
| `tooltip` | Installed | Info icons on summary cards |

**Responsive Strategy**:
- Mobile (< 768px): Summary cards stack vertically. Table switches to card-based list view (each tenant = a card). Tabs remain as horizontal scroll.
- Tablet (768px-1024px): Summary cards in a 3-column grid. Table with horizontal scroll if needed.
- Desktop (> 1024px): Full table with all columns visible. Summary cards in a row.

### Screen 3: Payment Detail / Receipt (`/pay/receipt/[id]` or dialog)

**Purpose**: Show a single payment record with receipt-quality detail. Downloadable as PDF.

**User Flow**:
1. Tenant clicks "Receipt" on a payment in their history.
2. Opens a full-page receipt view (or dialog, depending on context).
3. Shows: Liz logo, payment date, amount, tenant name, property address, unit number, payment method (last 4 digits from Stripe), confirmation number (Stripe payment intent ID).
4. "Download PDF" button generates and downloads a receipt.

**Component Hierarchy**:

```
ReceiptPage (app/(tenant)/pay/receipt/[id]/page.tsx)
├── ReceiptCard (print-optimized layout)
│   ├── Header: Liz logo + "Payment Receipt"
│   ├── ReceiptDetails
│   │   ├── Row: Date — April 1, 2026
│   │   ├── Row: Amount — $1,500.00
│   │   ├── Row: Property — 123 Main St
│   │   ├── Row: Unit — Apt 2B
│   │   ├── Row: Tenant — Jane Smith
│   │   ├── Row: Payment Method — Visa ending in 4242
│   │   └── Row: Confirmation — pi_3Xyz...
│   ├── Separator
│   ├── Footer: "Processed by Liz Property Management"
│   └── Button: "Download PDF" | "Print"
```

**shadcn Components**:

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Receipt container |
| `separator` | Installed | Section divider |
| `button` | Installed | Download / Print |

**Responsive Strategy**:
- Receipt is a fixed-width card (max-w-lg), centered on all screen sizes. Print-friendly CSS (`@media print`).

### Screen 4: Vendor Payment Tracker (tab within Payment Dashboard)

See "Vendor Payments" tab in Screen 2 above. The vendor payment tracker is integrated into the payment dashboard rather than being a separate page, since landlords need all financial data in one place.

**Log Vendor Payment Dialog** (the key interaction):

```
LogVendorPaymentDialog
├── DialogHeader ("Log Vendor Payment")
├── Form
│   ├── Select: Vendor (populated from /api/vendors)
│   ├── Input: Amount ($)
│   ├── Input: Date (date picker — use native input[type=date] for MVP)
│   ├── Input: Description (text)
│   ├── Select: Linked Request (optional — populated from /api/requests)
│   └── Button: "Save Payment" → POST /api/payments/vendor
└── DialogFooter
```

### Screen 5: Financial Summary (tab within Payment Dashboard)

See "Financial Summary" tab in Screen 2 above. The financial summary is a tab on the payment dashboard.

**Key Design Decisions**:
- The existing `SpendChart` on the main dashboard shows spend vs. rent per property. The financial summary extends this with actual collection data (not just the static `monthly_rent` value).
- The main dashboard `SpendChart` will be updated in a future iteration to pull from real payment data instead of static rent values, but that is not part of this feature's scope.
- Monthly trend chart reuses the `ChartContainer` + Recharts pattern from the existing `SpendChart` component.

## Data Model

### New Table: `payment_periods`

Tracks what each tenant owes for each billing period. Generated monthly.

```sql
create table payment_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants not null,
  property_id uuid references properties not null,
  landlord_id text not null,  -- Clerk user ID (denormalized for query efficiency)

  period_start date not null,          -- First day of billing month
  period_end date not null,            -- Last day of billing month
  amount_due decimal(10,2) not null,   -- Copied from properties.monthly_rent at generation time
  due_date date not null,              -- Default: 1st of month

  status text not null default 'pending',
    -- 'pending'  → generated, awaiting payment
    -- 'paid'     → payment confirmed via Stripe webhook
    -- 'overdue'  → past due_date with no payment (updated by check function)
    -- 'partial'  → future: partial payment received
    -- 'waived'   → landlord manually waived this period

  paid_at timestamptz,
  payment_id uuid,                     -- references payments.id once paid

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(tenant_id, period_start)      -- One period per tenant per month
);

create index idx_payment_periods_landlord on payment_periods(landlord_id);
create index idx_payment_periods_tenant on payment_periods(tenant_id);
create index idx_payment_periods_status on payment_periods(status);
create index idx_payment_periods_period on payment_periods(period_start);
```

### New Table: `payments`

Records each completed payment transaction. One payment per checkout session.

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  payment_period_id uuid references payment_periods not null,
  tenant_id uuid references tenants not null,
  property_id uuid references properties not null,
  landlord_id text not null,           -- Clerk user ID

  amount decimal(10,2) not null,
  currency text not null default 'usd',

  -- Stripe data
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  payment_method_type text,            -- 'card', 'us_bank_account', etc.
  payment_method_last4 text,           -- Last 4 digits for receipt display

  status text not null default 'pending',
    -- 'pending'   → checkout started, not yet confirmed
    -- 'completed' → webhook confirmed payment success
    -- 'failed'    → webhook confirmed payment failure
    -- 'refunded'  → payment was refunded (future)

  completed_at timestamptz,
  created_at timestamptz default now()
);

create index idx_payments_tenant on payments(tenant_id);
create index idx_payments_landlord on payments(landlord_id);
create index idx_payments_stripe_session on payments(stripe_checkout_session_id);
```

### New Table: `vendor_payments`

Manually logged vendor payments by landlords.

```sql
create table vendor_payments (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,           -- Clerk user ID
  vendor_id uuid references vendors not null,
  request_id uuid references maintenance_requests,  -- Optional link to a request

  amount decimal(10,2) not null,
  description text,
  paid_date date not null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_vendor_payments_landlord on vendor_payments(landlord_id);
create index idx_vendor_payments_vendor on vendor_payments(vendor_id);
```

### New Table: `stripe_accounts`

Stores Stripe Connect account info per landlord.

```sql
create table stripe_accounts (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null unique,    -- Clerk user ID (1:1)
  stripe_account_id text not null unique,  -- acct_...

  onboarding_complete boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_stripe_accounts_landlord on stripe_accounts(landlord_id);
```

### TypeScript Types

```typescript
export type PaymentPeriodStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'waived';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface PaymentPeriod {
  id: string;
  tenant_id: string;
  property_id: string;
  landlord_id: string;
  period_start: string;
  period_end: string;
  amount_due: number;
  due_date: string;
  status: PaymentPeriodStatus;
  paid_at: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  tenants?: { id: string; name: string; email: string | null; unit_number: string | null };
  properties?: { id: string; name: string; address: string };
}

export interface Payment {
  id: string;
  payment_period_id: string;
  tenant_id: string;
  property_id: string;
  landlord_id: string;
  amount: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payment_method_type: string | null;
  payment_method_last4: string | null;
  status: PaymentStatus;
  completed_at: string | null;
  created_at: string;
  // Joined relations
  tenants?: { id: string; name: string; email: string | null; unit_number: string | null };
  properties?: { id: string; name: string; address: string };
}

export interface VendorPayment {
  id: string;
  landlord_id: string;
  vendor_id: string;
  request_id: string | null;
  amount: number;
  description: string | null;
  paid_date: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  vendors?: { id: string; name: string; specialty: string };
  maintenance_requests?: { id: string; tenant_message: string; ai_category: string | null };
}

export interface StripeAccount {
  id: string;
  landlord_id: string;
  stripe_account_id: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

export interface FinancialSummary {
  period: string;              // "2026-04"
  rent_expected: number;
  rent_collected: number;
  collection_rate: number;     // 0-1
  maintenance_costs: number;
  vendor_payments_total: number;
  net_income: number;          // rent_collected - maintenance_costs - vendor_payments_total
}

export interface PropertyFinancials {
  property_id: string;
  property_name: string;
  rent_expected: number;
  rent_collected: number;
  maintenance_costs: number;
  net_income: number;
}
```

## Integration Points

### 1. Clerk Webhook (`/api/webhooks/clerk`)

No changes needed. Clerk creates the user in Supabase; Stripe Connect onboarding is a separate landlord-initiated action.

### 2. Tenant Layout/Nav

Add "Pay Rent" link to tenant navigation (icon: `CreditCard`). Links to `/pay`.

### 3. Landlord Sidebar Nav

Add "Payments" link to the landlord sidebar (icon: `DollarSign`). Links to `/dashboard/payments`. Position it after "Vendors" in the nav order.

### 4. Landlord Onboarding

After onboarding completes, show a "Set up rent collection" prompt on the dashboard. Do NOT add Stripe Connect to the onboarding wizard itself — it requires identity verification and bank info, which is too heavy for initial onboarding.

### 5. Dashboard (`/dashboard`)

- Update the `SectionCards` to include a "Rent Collected" stat card (pulling from `payments` table instead of static `monthly_rent`).
- The existing `SpendChart` continues to work as-is for Phase 2. A future task can update it to use real payment data.

### 6. Maintenance Requests

When a maintenance request has `actual_cost` set and a `vendor_id`, the payment dashboard can cross-reference with `vendor_payments` to show whether the vendor has been paid for that job.

### 7. P2-001 Rent Reminder

Payment Integration and Rent Reminder are complementary. P2-001 sends notifications about upcoming/overdue rent. This feature (P2-004) provides the payment mechanism and the `payment_periods` table that P2-001 can use to determine who needs a reminder. If P2-001 is built first, it can use the static `monthly_rent` field and be upgraded later. If P2-004 is built first, P2-001 gets the `payment_periods` table for free.

**Recommendation**: Build P2-004 before P2-001, so rent reminders have real payment status data to work with.

### 8. Stripe Webhook Security

The `/api/webhooks/stripe` route must:
- Verify the webhook signature using `STRIPE_WEBHOOK_SECRET`.
- Be excluded from Clerk auth middleware (it's called by Stripe, not a user).
- Handle events idempotently (Stripe may retry failed deliveries).

Events to handle:
- `checkout.session.completed` — mark payment as completed, update payment_period.
- `account.updated` — update stripe_accounts.charges_enabled / payouts_enabled.
- `charge.refunded` — mark payment as refunded (future, but wire up handler early).

## Manual Testing Checklist

### Stripe Connect Setup
- [ ] Landlord with no Stripe account sees "Connect with Stripe" banner on /dashboard/payments
- [ ] Clicking "Connect with Stripe" redirects to Stripe Express onboarding
- [ ] After completing Stripe onboarding, redirected back to /dashboard/payments
- [ ] Banner disappears once connected account is active
- [ ] `/api/payments/connect/status` returns correct account state

### Tenant Payment Flow
- [ ] Tenant visits /pay and sees current balance, due date, property info
- [ ] Amount matches the property's monthly_rent
- [ ] "Pay Rent" button is disabled if already paid this month (shows green "Paid" badge)
- [ ] "Pay Rent" redirects to Stripe Checkout with correct amount
- [ ] Successful payment redirects back to /pay?success=true with success toast
- [ ] Payment status updates to "paid" after webhook fires
- [ ] Canceled checkout redirects to /pay?canceled=true, no payment recorded
- [ ] Payment appears in tenant's payment history list
- [ ] "Receipt" link opens receipt with correct details

### Landlord Rent Collection View
- [ ] /dashboard/payments shows all tenants with payment status
- [ ] Summary cards show correct totals: expected, collected, collection rate
- [ ] Property filter narrows the table to one property
- [ ] Status filter shows only paid/pending/overdue as selected
- [ ] Paid tenants show green "Paid" badge with date
- [ ] Overdue tenants show red "Overdue" badge
- [ ] Pending tenants show yellow "Pending" badge

### Vendor Payment Tracking
- [ ] "Vendor Payments" tab shows empty state when no payments logged
- [ ] "Log Payment" opens dialog with vendor dropdown, amount, date, description
- [ ] Vendor dropdown populated from landlord's vendor list
- [ ] Optional "Linked Request" dropdown shows maintenance requests
- [ ] Saving creates a vendor payment record and it appears in the table
- [ ] Total vendor spend card updates correctly

### Financial Summary
- [ ] "Financial Summary" tab shows monthly P&L cards
- [ ] Rent Collected card shows sum of completed payments for the period
- [ ] Maintenance Costs card shows sum of actual_cost from maintenance_requests + vendor_payments
- [ ] Net Income = Rent Collected - Maintenance Costs
- [ ] Monthly trend chart shows data for the last 6 months
- [ ] Property breakdown table shows per-property financials
- [ ] Changing the period updates all cards and chart

### Receipt
- [ ] Receipt page shows correct payment details
- [ ] Receipt shows last 4 digits of payment method
- [ ] Receipt shows Stripe confirmation ID
- [ ] "Download PDF" generates and downloads a PDF receipt
- [ ] Receipt layout is print-friendly

### Edge Cases
- [ ] Tenant with no property assigned sees "No rent due" state
- [ ] Property with monthly_rent = 0 or null: tenant sees "No rent configured" message
- [ ] Landlord with no tenants sees empty state on rent collection tab
- [ ] Stripe webhook with duplicate session ID is handled idempotently (no duplicate payment)
- [ ] Tenant tries to pay when landlord has no Stripe account: shows friendly error
- [ ] Network error during checkout creation: error toast, no broken state
- [ ] Financial summary with no data (first month): shows $0 across all cards

## Tasks

Tasks will be numbered sequentially from the project's next available task ID. Outlined below for planning purposes.

| # | Tier | Title | Depends On |
|---|------|-------|------------|
| 1 | Haiku | Database migration — payment_periods, payments, vendor_payments, stripe_accounts tables | — |
| 2 | Haiku | Install Stripe SDK — `stripe` + `@stripe/stripe-js` packages | — |
| 3 | Sonnet | Stripe Connect API routes — onboard, status, account webhook handler | 1, 2 |
| 4 | Sonnet | Stripe Checkout API route — create checkout session for rent payment | 1, 2, 3 |
| 5 | Sonnet | Stripe webhook handler — checkout.session.completed, account.updated events | 1, 2 |
| 6 | Sonnet | Payment periods generation — on-demand function to create/update periods | 1 |
| 7 | Sonnet | Payments API routes — GET list, GET single, receipt data | 1 |
| 8 | Sonnet | Vendor payments API routes — POST create, GET list | 1 |
| 9 | Sonnet | Financial summary API route — monthly P&L aggregation query | 1, 7, 8 |
| 10 | Opus | Build tenant payment portal UI — /pay page with balance card + history | 4, 6, 7 |
| 11 | Opus | Build landlord payment dashboard UI — tabs, rent table, filters, summary cards | 3, 6, 7, 8, 9 |
| 12 | Opus | Build financial summary UI — P&L cards, trend chart, property breakdown | 9, 11 |
| 13 | Opus | Build vendor payment dialog + table UI — log payment form, list view | 8, 11 |
| 14 | Sonnet | Build receipt page UI — payment detail + PDF download | 7 |
| 15 | Sonnet | Stripe Connect banner + landlord nav integration | 3 |
| 16 | Sonnet | Tenant nav integration — add "Pay Rent" link + update tenant layout | 10 |
| 17 | Haiku | Middleware update — exclude /api/webhooks/stripe from Clerk auth | 5 |
| 18 | Haiku | Environment variables documentation + .env.example update | 2 |
| 19 | Haiku | Unit tests for payment API routes | 7, 8, 9 |
| 20 | Sonnet | Integration test — full checkout flow with Stripe test mode | 4, 5, 10 |

**Tier breakdown**: 4 Haiku, 10 Sonnet, 4 Opus (front-end work is always Opus per project rules, except the receipt page which is simple enough for Sonnet)
**Dependency graph**: Tasks 1 + 2 are independent foundations. Task 3 (Connect) and 5 (webhooks) depend on both. All API routes (4, 6, 7, 8, 9) depend on the migration. All UI tasks (10-16) depend on their respective API routes. Tests (19, 20) come last.

## Open Questions

1. **Platform fee structure** — Should Liz take a percentage of each rent payment? Recommendation: Start at 0% during beta to drive adoption. Add a configurable platform fee (e.g., 2.9% + $0.30 to cover Stripe's fee, or X% on top) once the value proposition is proven. The Stripe Connect Express setup supports this natively via `application_fee_amount`.

2. **Who pays Stripe's processing fee?** — Stripe charges ~2.9% + $0.30 per card transaction. Options: (a) landlord absorbs it (reduces rent collected), (b) tenant pays it (amount_due + fee), (c) Liz absorbs it (unsustainable). Recommendation: Default to (a) landlord absorbs, matching industry norms. Allow landlord to toggle "pass fee to tenant" in settings as a future enhancement.

3. **ACH / bank transfer support** — Card payments have high fees (~3%). ACH is ~0.8% capped at $5. Stripe supports both through Checkout. Recommendation: Start with card-only for simplicity (instant confirmation, familiar UX). Add ACH as a Phase 3 option once the payment flow is proven.

4. **Recurring / auto-pay** — Should tenants be able to set up auto-pay so rent is charged automatically each month? Recommendation: Not in Phase 2. This requires Stripe Subscriptions or saved payment methods + scheduled charges, adding significant complexity. Log it for Phase 3.

5. **Multi-property tenants** — A tenant renting from two landlords using Liz would see two separate balances on `/pay`. The current data model supports this (payment_periods are per tenant per property). The UI should handle it with a property selector. Mark as an edge case to test but not over-engineer for now.

6. **Late payment handling** — How are periods marked overdue? Recommendation: An on-demand check when the dashboard or `/pay` page loads. If `status = 'pending'` and `due_date < today`, update to `overdue`. No cron job needed for MVP. A nightly cron can be added later if needed for notifications (P2-001 integration).

7. **Refunds** — Should landlords be able to issue refunds through Liz? Recommendation: Not in Phase 2. Refunds can be handled directly in Stripe Dashboard. Wire up the `charge.refunded` webhook handler so the status updates automatically, but don't build a refund UI yet.

8. **Receipt PDF library** — `@react-pdf/renderer` (React components to PDF) vs. `jspdf` (imperative PDF generation) vs. server-side HTML-to-PDF. Recommendation: Use `@react-pdf/renderer` for consistency with the React codebase. Evaluate during task 14 implementation.

9. **Build order vs. P2-001** — P2-004 (payments) and P2-001 (rent reminders) share the concept of "rent due dates." Recommendation: Build P2-004 first. The `payment_periods` table provides the data model that P2-001 needs. If P2-001 is already built against the static `monthly_rent` field, it can be upgraded to use `payment_periods` when P2-004 ships.
