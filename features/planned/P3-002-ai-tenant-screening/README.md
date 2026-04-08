# Feature: AI Tenant Screening

**ID**: P3-002
**Ticket**: T-009
**Phase**: 3 — Full Vision

## TL;DR

Let landlords receive, screen, and decide on tenant applications from one place. Applicants fill out a public form. Liz pulls background check data, runs AI analysis (income ratios, employment stability, rental history flags), and delivers a risk-scored recommendation. The landlord reviews and approves or denies — with fair housing compliance baked into every layer.

## Summary

Small landlords currently spend 3-5 hours per application: reading through forms, ordering background checks ($30-50 each), calling references, doing mental math on income-to-rent ratios, and making gut decisions. Bad tenant selection is the single most expensive mistake a landlord makes — one eviction costs $5,000-10,000 in lost rent, legal fees, and property damage.

This feature adds a full **tenant screening pipeline** to Liz:

1. **Application Portal** — A public form (no auth required) where applicants submit personal info, employment details, income, references, and consent to a background check. Landlords share a unique link per property.
2. **Background Check Integration** — After submission, Liz orders a background check via a third-party API (TransUnion SmartMove or RentPrep). Results feed into the AI analysis.
3. **AI Screening Analysis** — Claude analyzes the full application: income-to-rent ratio, employment stability, credit indicators, eviction history, reference quality, and any red flags. Produces a structured risk score (1-100) with itemized reasoning.
4. **Landlord Review Dashboard** — Applications are listed by property with status badges. Each application detail page shows a two-column layout: applicant info on the left, AI analysis on the right.
5. **Approve/Deny Workflow** — The landlord makes the final call. A fair housing disclaimer is shown before every denial. Optional message to applicant.
6. **Applicant Status Tracking** — Applicants can check their status on a public page (no auth required) using a unique link emailed at submission.

**Critical constraint**: The AI screening layer must be defensibly objective. It must never use or reference protected classes under the Fair Housing Act (race, color, national origin, religion, sex, familial status, disability). The compliance architecture is not an afterthought — it is a load-bearing wall.

### Why Phase 3

This feature depends on:
- **Clerk auth maturity** (P1-002) — Role-based access for landlords vs. public applicant access
- **Property data model** (P1-001) — Applications are linked to properties
- **Landlord decision profiles** (P1-003) — Screening preferences (auto-deny thresholds, minimum income ratio) extend the existing profile
- **Rule-based automation** (P2-003) — Automated screening rules (e.g., "auto-reject if income < 2x rent") build on the Phase 2 rules engine

## User Stories

### Applicant
- As an applicant, I want to fill out one form with all my info so I do not have to email documents back and forth with the landlord.
- As an applicant, I want to know what information is required upfront so I can gather it before starting.
- As an applicant, I want to consent to a background check explicitly so I understand what is being checked.
- As an applicant, I want to check my application status without creating an account so I do not need another login.
- As an applicant, I want to receive a confirmation email with a status-check link after I submit.

### Landlord
- As a landlord, I want to share a unique application link per property so applicants apply to the right unit.
- As a landlord, I want to see all applications in one dashboard so I do not juggle emails and PDFs.
- As a landlord, I want an AI risk score with itemized reasoning so I can make faster, more informed decisions.
- As a landlord, I want to see income-to-rent ratio calculated automatically so I do not do the math myself.
- As a landlord, I want background check results integrated into the AI analysis so I see one unified report.
- As a landlord, I want to set minimum screening criteria (e.g., minimum income ratio, no evictions) so obviously unqualified applicants are flagged automatically.
- As a landlord, I want to approve or deny with one click and optionally send a message to the applicant.
- As a landlord, I want a fair housing compliance reminder before every denial so I am protected legally.
- As a landlord, I want to compare multiple applicants side-by-side for the same property.

## Architecture

### Screening Pipeline

```
Applicant submits form
        │
        ▼
POST /api/applications ──→ applications table (status: submitted)
        │
        ├──→ Send confirmation email (with status link)
        │
        ▼
Landlord clicks "Run Screening"
        │
        ▼
POST /api/applications/[id]/screen
        │
        ├──→ Order background check (TransUnion SmartMove API)
        │       └──→ Webhook callback: /api/webhooks/screening
        │               └──→ Store results in screening_reports table
        │
        ├──→ Run AI analysis (Claude API)
        │       ├── Input: application data + background check results
        │       ├── Compliance filter: strip protected-class signals BEFORE prompt
        │       ├── Output: structured JSON (risk_score, factors[], recommendation)
        │       └──→ Store in screening_reports table
        │
        └──→ Update application status: reviewing → screened
                │
                ▼
Landlord reviews AI report on detail page
        │
        ├── Approve ──→ POST /api/applications/[id]/decide (decision: approved)
        │       └──→ Email applicant, update status
        │
        └── Deny ──→ POST /api/applications/[id]/decide (decision: denied)
                ├──→ Fair housing disclaimer confirmation required
                ├──→ Optional denial reason (from allowed list, never free-text to applicant)
                └──→ Email applicant (generic — no AI reasoning exposed)
```

### Compliance Layer (Pre-Prompt Filter)

```
Raw Application Data
        │
        ▼
┌─────────────────────────────┐
│   COMPLIANCE FILTER          │
│                              │
│   REMOVE before AI sees it:  │
│   - Name (replaced with ID)  │
│   - Photos / profile images  │
│   - National origin signals  │
│   - Religious affiliations   │
│   - Familial status details  │
│   - Disability info          │
│   - Gender / sex markers     │
│                              │
│   KEEP (objective factors):  │
│   - Monthly income (number)  │
│   - Employment duration      │
│   - Credit score range       │
│   - Eviction history (Y/N)  │
│   - Debt-to-income ratio     │
│   - Rental history duration  │
│   - Reference responses      │
│                              │
│   Log: what was filtered,    │
│   hash of original for audit │
└─────────────────────────────┘
        │
        ▼
Claude API (sanitized input only)
        │
        ▼
AI Screening Report (structured JSON)
```

### Route Groups

```
Public (no auth):
  /apply/[property-id]           — Application form
  /apply/status/[tracking-id]    — Status check page

Landlord (auth required):
  /dashboard/applications        — Applications dashboard
  /dashboard/applications/[id]   — Application detail + AI report
```

### New API Routes

```
POST   /api/applications                     — Submit application (public)
GET    /api/applications                     — List applications for landlord
GET    /api/applications/[id]                — Get application detail
POST   /api/applications/[id]/screen         — Trigger screening (background + AI)
POST   /api/applications/[id]/decide         — Approve or deny
GET    /api/applications/status/[tracking-id] — Public status check
POST   /api/webhooks/screening               — Background check callback
GET    /api/properties/[id]/apply-link       — Generate/get application link
```

## Tech Approach

### Background Check API Integration

**Primary choice: TransUnion SmartMove**

TransUnion SmartMove is the standard for small landlord screening. It handles credit, criminal, and eviction checks with applicant-initiated consent (the applicant enters their SSN directly on TransUnion's hosted page — Liz never touches it).

```
Liz creates screening request → SmartMove sends applicant an email
    → Applicant completes identity verification on SmartMove site
    → SmartMove runs checks and sends results via webhook
    → Liz receives results and runs AI analysis
```

**Why SmartMove over RentPrep**:
- Applicant-initiated: SSN never touches our servers (major liability reduction)
- TransUnion brand recognition (applicants trust it more)
- Webhook-based results (no polling)
- Includes: credit report, criminal background, eviction history, income insights

**Fallback: RentPrep** — Simpler API, lower cost ($21/check vs $40), but landlord-initiated (SSN passes through our API).

**Integration pattern**:
- Abstract behind a `ScreeningProvider` interface so providers can be swapped
- Store provider-agnostic results in our schema (normalized format)
- Never store raw SSN or full credit report — only the structured summary

```typescript
interface ScreeningProvider {
  createScreeningRequest(application: ApplicationData): Promise<ScreeningRequestResult>;
  parseWebhookPayload(payload: unknown): Promise<ScreeningResults>;
  getStatus(externalId: string): Promise<ScreeningStatus>;
}
```

### AI Analysis (Claude API)

The AI analysis runs AFTER background check results are available. Claude receives a sanitized, structured prompt:

```
You are a tenant screening analyst. Evaluate this application using ONLY
the objective financial and rental-history data provided. Do not infer or
comment on the applicant's race, ethnicity, religion, sex, familial status,
national origin, or disability status.

APPLICATION DATA (anonymized):
- Applicant ID: APP-2847 (no name provided to you)
- Monthly gross income: $6,200
- Stated monthly rent at current residence: $1,400
- Employment duration: 3 years 2 months
- Credit score range: 680-720
- Eviction history: none
- Outstanding collections: 1 ($340, medical)
- Rental history: 4 years continuous
- Reference check: 2/2 positive

PROPERTY:
- Monthly rent: $1,800
- Required income ratio: 3x

Analyze and return JSON:
{
  "risk_score": <1-100, higher is lower risk>,
  "income_to_rent_ratio": <number>,
  "factors": [
    { "category": "...", "signal": "positive|neutral|negative", "detail": "..." }
  ],
  "recommendation": "approve" | "approve_with_conditions" | "review_further" | "deny",
  "reasoning": "...",
  "conditions": ["..."] // if approve_with_conditions
}
```

**Key constraints on the AI prompt**:
- Applicant name is never included — replaced with an anonymous ID
- Only objective, quantifiable data points are provided
- The system prompt explicitly instructs the model to avoid protected-class references
- The output is structured JSON — no free-text narrative that could contain bias
- Every AI screening report is logged with the exact prompt used (for audit)

### Email Notifications

For MVP, use a simple transactional email service (Resend or SendGrid) for:
- Application confirmation to applicant (with status-check link)
- "New application received" to landlord
- Decision notification to applicant (approved/denied — generic template, no AI reasoning)

### Tracking IDs

Applicants check status using a tracking ID (UUID) rather than authentication. The tracking ID is:
- Generated at submission time
- Included in the confirmation email
- Used to access `/apply/status/[tracking-id]`
- Not guessable (UUID v4 — 122 bits of entropy)

## UI Development Process

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design tenant-application-portal         # Phase 1: Public application form
/ux-design applications-dashboard            # Phase 1: Landlord applications list
/ux-design application-detail-report         # Phase 1: Detail + AI report view
/ux-design applicant-status-page             # Phase 1: Public status check

/ui-build tenant-application-portal          # Phase 2: Build each
/ui-build applications-dashboard
/ui-build application-detail-report
/ui-build applicant-status-page

/ui-refine ApplicationForm                   # Phase 3: Polish
/ui-refine ApplicationsDashboard
/ui-refine ApplicationDetail
/ui-refine ScreeningReport
/ui-refine ApplicantStatusPage
```

### Design Principles

1. **Public forms must feel trustworthy**: Applicants are sharing sensitive data (income, employer, SSN consent). Clean design, clear privacy language, professional look. No playful UI — this is a legal document.
2. **Mobile-first for applicants**: Most applicants will fill the form on their phone. Every input must be thumb-friendly, with smart keyboard types (tel for phone, email for email, numeric for income).
3. **Progressive disclosure**: Do not show all fields at once. Break the form into logical sections with a progress indicator. Validate each section before advancing.
4. **Landlord dashboard is scan-optimized**: Status badges, risk scores, and key metrics visible without clicking into detail. Sort/filter by property, status, risk score, and date.
5. **AI report is glanceable then deep**: Show the risk score, recommendation, and top 3 factors above the fold. Full breakdown available by scrolling.
6. **Fair housing compliance is visible**: The deny flow shows a fair housing reminder. The AI report never contains language about protected classes. The landlord sees a compliance badge on every report.

### Screen 1: Application Portal (`/apply/[property-id]`)

**Purpose**: Public form for applicants to submit their rental application.

**Layout**: Centered single-column form (max-w-2xl), clean white card on light gray background. Property info header at top. Progress bar for multi-section form.

**Component Hierarchy**:
```
ApplyPage (app/(public)/apply/[property-id]/page.tsx)
├── PropertyHeader
│   ├── Property name, address, rent amount
│   └── "Powered by Liz" badge (subtle branding)
├── ApplicationForm (components/screening/application-form.tsx)
│   ├── Progress (shadcn) — "Section 2 of 5"
│   ├── Section 1: Personal Information
│   │   ├── Input — Full name
│   │   ├── Input — Email
│   │   ├── Input — Phone
│   │   └── Textarea — Current address
│   ├── Section 2: Employment & Income
│   │   ├── Input — Employer name
│   │   ├── Input — Job title
│   │   ├── Input — Employment start date (month/year)
│   │   ├── Input — Monthly gross income ($)
│   │   └── Input — Other income sources (optional, $)
│   ├── Section 3: Rental History
│   │   ├── Input — Current landlord name
│   │   ├── Input — Current landlord phone
│   │   ├── Input — Monthly rent at current residence ($)
│   │   ├── Input — Move-in date at current residence
│   │   └── Textarea — Reason for moving
│   ├── Section 4: References
│   │   ├── ReferenceEntry — Reference 1 (name, phone, relationship)
│   │   └── ReferenceEntry — Reference 2 (name, phone, relationship)
│   ├── Section 5: Consent & Submit
│   │   ├── Card — Privacy notice (what data is collected, how it's used)
│   │   ├── Checkbox — "I consent to a background and credit check"
│   │   ├── Checkbox — "I certify the above information is accurate"
│   │   └── Button (primary) — "Submit Application"
│   └── ValidationErrors (inline per field + summary at top of section)
└── Footer — Privacy policy link, contact info
```

**shadcn components**: `Card`, `Button`, `Input`, `Label`, `Textarea`, `Progress`, `Separator`, `Checkbox` (needs install)

**Responsive**: Full-width on mobile, centered card on desktop. Sections stack vertically. Large touch targets on all inputs. Smart keyboard types (inputMode="tel", inputMode="email", inputMode="numeric").

**User flow**:
1. Applicant opens link shared by landlord
2. Sees property info + "Apply for this property" header
3. Fills out sections 1-5, progressing with Next/Back buttons
4. Reviews consent language, checks both boxes
5. Submits -> sees confirmation page with tracking link
6. Receives confirmation email

### Screen 2: Applications Dashboard (`/dashboard/applications`)

**Purpose**: Landlord sees all applications across properties, filterable and sortable.

**Layout**: Standard dashboard layout (sidebar + main content). Table/list view with filters at top. Similar pattern to existing `/dashboard/requests` page.

**Component Hierarchy**:
```
ApplicationsPage (app/(landlord)/dashboard/applications/page.tsx)
├── PageHeader — "Applications" + property filter dropdown
├── ApplicationFilters (components/screening/application-filters.tsx)
│   ├── Select — Filter by property ("All Properties" | specific)
│   ├── Select — Filter by status ("All" | "New" | "Screening" | "Screened" | "Approved" | "Denied")
│   └── Select — Sort by ("Newest" | "Risk Score" | "Income Ratio")
├── ApplicationsList (components/screening/applications-list.tsx)
│   ├── ApplicationCard (repeated) — one per application
│   │   ├── Left: Applicant name, property name, submitted date
│   │   ├── Center: Key metrics row
│   │   │   ├── Badge — Status (color-coded: blue=new, yellow=screening, green=approved, red=denied)
│   │   │   ├── RiskScoreBadge — "78/100" (color-coded by range)
│   │   │   └── IncomeRatio — "3.4x" (green if meets minimum, red if below)
│   │   └── Right: "View" button → navigates to detail
│   └── EmptyState — "No applications yet. Share your application link to get started."
└── QuickActions
    └── Button — "Copy Application Link" (per property)
```

**shadcn components**: `Card`, `Badge`, `Button`, `Select`, `Table` (for desktop), `Separator`, `Skeleton` (loading state), `Tooltip`

**Responsive**: Cards stack vertically on mobile. Table view on desktop (>1024px). Filters collapse into a sheet on mobile. Status badges always visible.

**User flow**:
1. Landlord navigates to Applications from sidebar
2. Sees list of all applications, newest first
3. Filters by property or status
4. Clicks into an application to see detail + AI report

### Screen 3: Application Detail (`/dashboard/applications/[id]`)

**Purpose**: Full application data + AI screening report for landlord review.

**Layout**: Two-column on desktop (60/40 split). Left column: applicant info and documents. Right column: AI analysis card. Stacks vertically on mobile (AI report on top for quick glance).

**Component Hierarchy**:
```
ApplicationDetailPage (app/(landlord)/dashboard/applications/[id]/page.tsx)
├── Breadcrumb — Applications > "John D. — 123 Main St"
├── ApplicationStatusBar
│   ├── Badge — Current status
│   ├── Timestamp — "Submitted Apr 3, 2026"
│   └── Actions — "Run Screening" (if not yet screened) or "Make Decision" (if screened)
├── TwoColumnLayout
│   ├── LeftColumn (applicant info)
│   │   ├── Card — Personal Information
│   │   │   ├── Name, email, phone
│   │   │   └── Current address
│   │   ├── Card — Employment & Income
│   │   │   ├── Employer, title, start date
│   │   │   ├── Monthly income (highlighted)
│   │   │   └── Income-to-rent ratio (calculated, prominent)
│   │   ├── Card — Rental History
│   │   │   ├── Current landlord, rent, duration
│   │   │   └── Reason for moving
│   │   ├── Card — References
│   │   │   ├── Reference 1 — name, phone, relationship, status (contacted/pending)
│   │   │   └── Reference 2 — same
│   │   └── Card — Documents / Uploads (future: pay stubs, ID)
│   │
│   └── RightColumn (AI analysis)
│       ├── ScreeningReport (components/screening/screening-report.tsx)
│       │   ├── RiskScoreCard
│       │   │   ├── Large circular score display (1-100)
│       │   │   ├── Color: green (70+), yellow (40-69), red (<40)
│       │   │   └── Label: "Low Risk" / "Medium Risk" / "High Risk"
│       │   ├── RecommendationBadge
│       │   │   └── "Approve" / "Approve with Conditions" / "Review Further" / "Deny"
│       │   ├── KeyFactors (top 3 factors, above the fold)
│       │   │   ├── FactorRow — icon + "Income: 3.4x rent" + green/red indicator
│       │   │   ├── FactorRow — icon + "Employment: 3+ years stable" + green indicator
│       │   │   └── FactorRow — icon + "Collections: 1 item ($340)" + yellow indicator
│       │   ├── Separator
│       │   ├── DetailedBreakdown (collapsible sections)
│       │   │   ├── Collapsible — Income Analysis
│       │   │   │   ├── Gross income vs rent
│       │   │   │   ├── Debt-to-income estimate
│       │   │   │   └── Income stability assessment
│       │   │   ├── Collapsible — Employment Verification
│       │   │   │   ├── Employment duration
│       │   │   │   ├── Job stability indicator
│       │   │   │   └── Industry context
│       │   │   ├── Collapsible — Background Check Results
│       │   │   │   ├── Credit score range
│       │   │   │   ├── Criminal background: clear / flagged
│       │   │   │   ├── Eviction history: none / flagged
│       │   │   │   └── Collections summary
│       │   │   └── Collapsible — Rental History
│       │   │       ├── Duration at current residence
│       │   │       ├── Landlord reference status
│       │   │       └── Rent payment consistency
│       │   ├── ComplianceBadge
│       │   │   └── "Fair Housing Compliant" + shield icon + tooltip explaining what this means
│       │   └── AuditInfo (small text)
│       │       └── "Screened on Apr 4, 2026 at 2:15 PM — Report ID: SCR-4821"
│       └── DecisionPanel (sticky on scroll, desktop)
│           ├── Button (green) — "Approve"
│           ├── Button (red) — "Deny"
│           └── Button (outline) — "Request More Info" (future)
└── CompareDrawer (optional, triggered from dashboard)
    └── Side-by-side comparison of 2-3 applicants for same property
```

**shadcn components**: `Card`, `Badge`, `Button`, `Breadcrumb`, `Separator`, `Collapsible`, `Tooltip`, `Dialog` (for decision confirmation), `Drawer` (for compare), `Skeleton`

**Responsive**: Two-column on desktop (>1024px), single column on mobile with AI report card first (sticky at top briefly, then scrolls naturally). Decision buttons fixed at bottom on mobile.

### Screen 4: AI Screening Report (embedded in Screen 3)

The `ScreeningReport` component detailed above is the AI report. It is not a separate page — it is the right column of the Application Detail page. The component hierarchy is shown in Screen 3.

**Key design decisions**:
- Risk score is a large, prominent visual element (circular gauge or large number)
- Recommendation is a single word/phrase with a color-coded badge
- Top 3 factors are always visible (no scrolling needed)
- Detailed breakdown uses collapsible sections so the page is not overwhelming
- Compliance badge is always visible — it is not optional or collapsible
- The report never shows free-text AI reasoning to the landlord — only structured factors. This prevents the AI from accidentally surfacing protected-class language in a narrative format.

### Screen 5: Approve/Deny Flow (Dialog within Screen 3)

**Purpose**: Confirm the landlord's decision with fair housing guardrails.

**Component Hierarchy**:
```
DecisionDialog (components/screening/decision-dialog.tsx)
├── If APPROVE:
│   ├── Dialog header: "Approve Application"
│   ├── Summary: "Approve [Name] for [Property]?"
│   ├── Textarea (optional) — Message to applicant
│   └── Button — "Confirm Approval"
│
├── If DENY:
│   ├── Dialog header: "Deny Application"
│   ├── FairHousingReminder (Card, yellow/warning style)
│   │   ├── Icon: AlertTriangle
│   │   ├── Title: "Fair Housing Compliance Reminder"
│   │   ├── Body: "Under the Fair Housing Act, you may not deny an application
│   │   │   based on race, color, national origin, religion, sex, familial
│   │   │   status, or disability."
│   │   └── Link: "Learn more about Fair Housing requirements"
│   ├── Select — Denial reason (required, from allowed list):
│   │   ├── "Insufficient income"
│   │   ├── "Negative credit history"
│   │   ├── "Negative rental history"
│   │   ├── "Incomplete application"
│   │   ├── "Criminal background"
│   │   ├── "Property no longer available"
│   │   └── "Other objective criteria"
│   ├── Checkbox — "I confirm this denial is based on objective criteria and
│   │   does not violate fair housing laws."
│   └── Button (red) — "Confirm Denial" (disabled until checkbox checked)
│
└── PostDecision
    ├── Success toast: "Decision recorded. Applicant will be notified."
    └── Redirect back to applications list
```

**shadcn components**: `Dialog`, `Button`, `Textarea`, `Select`, `Card`, `Checkbox`, `Alert` (for fair housing warning)

**Key constraint**: The denial reason sent to the applicant is always a generic template — never the AI analysis or the landlord's internal notes. Example: "After careful review, we have decided not to move forward with your application for [Property]. If you have questions, please contact [Landlord Phone/Email]."

### Screen 6: Applicant Status Page (`/apply/status/[tracking-id]`)

**Purpose**: Public page where applicants check their application status.

**Layout**: Centered card, minimal UI, no auth required. Similar visual style to the application form for consistency.

**Component Hierarchy**:
```
StatusPage (app/(public)/apply/status/[tracking-id]/page.tsx)
├── PropertyHeader (same as application form — property name, address)
├── StatusCard (components/screening/status-card.tsx)
│   ├── Card
│   │   ├── Header: "Application Status"
│   │   ├── StatusTimeline — vertical timeline showing:
│   │   │   ├── Step — "Submitted" (date) — always checked
│   │   │   ├── Step — "Under Review" (date or "Pending")
│   │   │   ├── Step — "Screening Complete" (date or "Pending")
│   │   │   └── Step — "Decision Made" (date or "Pending")
│   │   ├── CurrentStatus
│   │   │   ├── If pending: "Your application is being reviewed. We'll notify you when there's an update."
│   │   │   ├── If approved: "Congratulations! Your application has been approved. The landlord will contact you with next steps."
│   │   │   └── If denied: "After review, the landlord has decided not to move forward at this time. [Generic message]"
│   │   └── ContactInfo — Landlord email/phone for questions
│   └── Footer — "Powered by Liz" + privacy policy link
└── NotFound — "Application not found. Check your tracking link and try again."
```

**shadcn components**: `Card`, `Badge`, `Separator`

**Responsive**: Works on any screen size — simple centered card.

**Privacy**: This page shows only status. It does not reveal the AI analysis, risk score, or denial reason details. The applicant sees "approved" or "not approved" with a generic message.

## Data Model

### New Table: `applications`

```sql
create table applications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  landlord_id text not null,          -- Clerk user ID (denormalized for query speed)
  tracking_id uuid not null unique default gen_random_uuid(),  -- Public status lookup

  -- Status lifecycle
  status text not null default 'submitted',
    -- submitted → screening → screened → approved → denied

  -- Personal info
  applicant_name text not null,
  applicant_email text not null,
  applicant_phone text,
  current_address text,

  -- Employment & income
  employer_name text,
  job_title text,
  employment_start_date date,
  monthly_gross_income decimal(10,2),
  other_income decimal(10,2) default 0,

  -- Rental history
  current_landlord_name text,
  current_landlord_phone text,
  current_monthly_rent decimal(10,2),
  current_move_in_date date,
  reason_for_moving text,

  -- References (stored as JSONB for flexibility)
  references jsonb default '[]'::jsonb,
    -- [{ "name": "", "phone": "", "relationship": "" }]

  -- Consent
  background_check_consent boolean not null default false,
  information_accuracy_consent boolean not null default false,
  consented_at timestamptz,

  -- Decision
  decision text,                -- 'approved' | 'denied'
  decision_reason text,         -- From allowed list (for denials)
  decision_notes text,          -- Internal landlord notes (never shown to applicant)
  decided_at timestamptz,
  decided_by text,              -- Clerk user ID of landlord who made decision

  -- Applicant message (sent with decision notification)
  applicant_message text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_applications_property on applications(property_id);
create index idx_applications_landlord on applications(landlord_id);
create index idx_applications_tracking on applications(tracking_id);
create index idx_applications_status on applications(status);
```

### New Table: `screening_reports`

```sql
create table screening_reports (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications not null unique,

  -- Background check (from provider)
  provider text,                   -- 'transunion_smartmove' | 'rentprep'
  provider_request_id text,        -- External ID for tracking
  provider_status text,            -- 'pending' | 'completed' | 'failed'
  credit_score_range text,         -- '680-720' (range, not exact)
  criminal_background text,        -- 'clear' | 'flagged'
  eviction_history text,           -- 'none' | 'flagged'
  collections_count int default 0,
  collections_total decimal(10,2) default 0,
  background_check_completed_at timestamptz,

  -- AI analysis
  risk_score int,                  -- 1-100 (higher = lower risk)
  income_to_rent_ratio decimal(4,2),
  recommendation text,             -- 'approve' | 'approve_with_conditions' | 'review_further' | 'deny'
  ai_factors jsonb default '[]'::jsonb,
    -- [{ "category": "income", "signal": "positive", "detail": "..." }]
  ai_conditions jsonb default '[]'::jsonb,
    -- ["Require additional security deposit", ...]
  ai_reasoning text,               -- Internal: never shown to applicant

  -- Audit trail
  prompt_hash text,                -- SHA-256 of the prompt sent to Claude
  prompt_snapshot text,            -- Full prompt text (for audit/compliance)
  model_used text,                 -- 'claude-sonnet-4-20250514' etc.
  screened_at timestamptz,

  created_at timestamptz default now()
);

create index idx_screening_reports_application on screening_reports(application_id);
```

### New Table: `screening_audit_log`

```sql
create table screening_audit_log (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications not null,
  action text not null,            -- 'submitted' | 'screening_started' | 'background_check_completed' |
                                   -- 'ai_analysis_completed' | 'decision_made' | 'notification_sent'
  actor text,                      -- Clerk user ID or 'system'
  details jsonb,                   -- Action-specific context
  created_at timestamptz default now()
);

create index idx_screening_audit_application on screening_audit_log(application_id);
```

### Modify Existing Table: `landlord_profiles`

```sql
alter table landlord_profiles
  add column min_income_ratio decimal(3,1) default 3.0,
    -- Minimum income-to-rent ratio for screening
  add column auto_reject_evictions boolean default true,
    -- Auto-flag applicants with eviction history
  add column screening_provider text default 'transunion_smartmove';
    -- Preferred background check provider
```

### TypeScript Types

```typescript
export type ApplicationStatus = 'submitted' | 'screening' | 'screened' | 'approved' | 'denied';
export type ScreeningRecommendation = 'approve' | 'approve_with_conditions' | 'review_further' | 'deny';
export type FactorSignal = 'positive' | 'neutral' | 'negative';
export type DecisionReason =
  | 'insufficient_income'
  | 'negative_credit'
  | 'negative_rental_history'
  | 'incomplete_application'
  | 'criminal_background'
  | 'property_unavailable'
  | 'other_objective_criteria';

export interface ApplicationReference {
  name: string;
  phone: string;
  relationship: string;
}

export interface Application {
  id: string;
  property_id: string;
  landlord_id: string;
  tracking_id: string;
  status: ApplicationStatus;

  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  current_address: string | null;

  employer_name: string | null;
  job_title: string | null;
  employment_start_date: string | null;
  monthly_gross_income: number | null;
  other_income: number | null;

  current_landlord_name: string | null;
  current_landlord_phone: string | null;
  current_monthly_rent: number | null;
  current_move_in_date: string | null;
  reason_for_moving: string | null;

  references: ApplicationReference[];

  background_check_consent: boolean;
  information_accuracy_consent: boolean;
  consented_at: string | null;

  decision: 'approved' | 'denied' | null;
  decision_reason: DecisionReason | null;
  decided_at: string | null;

  applicant_message: string | null;

  created_at: string;
  updated_at: string;

  // Joined relations
  properties?: { id: string; name: string; address: string; monthly_rent: number | null };
  screening_reports?: ScreeningReport;
}

export interface ScreeningFactor {
  category: string;
  signal: FactorSignal;
  detail: string;
}

export interface ScreeningReport {
  id: string;
  application_id: string;

  provider: string | null;
  provider_status: string | null;
  credit_score_range: string | null;
  criminal_background: string | null;
  eviction_history: string | null;
  collections_count: number;
  collections_total: number;
  background_check_completed_at: string | null;

  risk_score: number | null;
  income_to_rent_ratio: number | null;
  recommendation: ScreeningRecommendation | null;
  ai_factors: ScreeningFactor[];
  ai_conditions: string[];

  screened_at: string | null;
  created_at: string;
}
```

## Integration Points

### 1. Property Pages — Application Link

Each property gets an application link: `/apply/[property-id]`. The properties dashboard adds a "Copy Application Link" button per property. The link works without auth — anyone with the link can apply.

### 2. Landlord Decision Profile — Screening Preferences

The existing `landlord_profiles` table is extended with screening preferences:
- `min_income_ratio` (default 3.0) — Used by AI to flag applications below threshold
- `auto_reject_evictions` (default true) — AI flags eviction history as a strong negative factor
- `screening_provider` — Which background check service to use

These preferences are read by the AI screening prompt to calibrate the analysis.

### 3. Sidebar Navigation

Add "Applications" to the landlord sidebar, between "Requests" and "Vendors" (or wherever is most logical). Badge shows count of new (unreviewed) applications.

### 4. Dashboard Stats

Extend the dashboard stats card to include:
- Active applications count
- Approval rate (last 30 days)
- Average time to decision

### 5. Email Service

New integration: transactional email (Resend or SendGrid). Required for:
- Applicant confirmation
- Landlord "new application" notification
- Decision notification to applicant

This is a new infrastructure dependency. Email service setup should be a standalone task.

### 6. Background Check Webhook

`/api/webhooks/screening` receives results from the screening provider. Must:
- Validate webhook signature (provider-specific)
- Parse results into normalized format
- Update `screening_reports` table
- Trigger AI analysis automatically
- Log to `screening_audit_log`

## Fair Housing Compliance

This section is critical. The Fair Housing Act (42 U.S.C. 3601-3619) prohibits discrimination in housing based on seven protected classes: **race, color, national origin, religion, sex, familial status, and disability**. Many states add additional protections (sexual orientation, gender identity, source of income, etc.).

### Compliance Architecture (Defense in Depth)

The system uses four layers of protection:

**Layer 1: Data Collection**
- The application form does NOT ask about protected classes
- No field for race, religion, national origin, sex, disability status, marital status, or number of children
- No photo upload for applicant identification (prevents visual bias)
- The form collects only: name, contact info, employment, income, rental history, references, and consent

**Layer 2: Pre-Prompt Sanitization (Compliance Filter)**
- Before sending data to Claude, the compliance filter REMOVES the applicant's name (replaced with anonymous ID)
- This prevents the AI from inferring ethnicity or national origin from names
- Only objective, quantifiable data points are included in the prompt
- The filter logs what was removed and a hash of the original data for audit purposes

**Layer 3: AI Prompt Constraints**
- The system prompt explicitly instructs Claude: "Do not infer or comment on the applicant's race, ethnicity, religion, sex, familial status, national origin, or disability status."
- The output format is structured JSON with predefined factor categories — no free-text narratives
- Factor categories are limited to: `income`, `employment`, `credit`, `eviction_history`, `rental_history`, `collections`, `references`
- The recommendation is constrained to four options: `approve`, `approve_with_conditions`, `review_further`, `deny`

**Layer 4: Decision Audit Trail**
- Every screening action is logged in `screening_audit_log`
- The exact prompt sent to Claude is stored (for regulatory review)
- Denial reasons are selected from a pre-approved list — no free-text denial reasons to applicants
- The landlord must check a fair housing compliance checkbox before confirming any denial
- All decisions are timestamped and attributed to a specific landlord (Clerk user ID)

### What the AI Never Receives

| Data Point | Why It's Excluded |
|-----------|-------------------|
| Applicant name | Could signal national origin, ethnicity, or religion |
| Photo / profile image | Could reveal race, disability, age |
| Number of children | Familial status is protected |
| Marital status | Often correlated with sex/familial status |
| Country of birth | National origin |
| Language preference | Could signal national origin |
| Religious affiliations | Religion is protected |
| Disability accommodations | Disability is protected |
| Source of income type | Protected in many states (e.g., Section 8) |

### What the AI Receives (Objective Factors Only)

| Data Point | Why It's Allowed |
|-----------|-----------------|
| Monthly gross income ($) | Objective financial metric |
| Employment duration | Objective employment history |
| Credit score range | Industry-standard creditworthiness metric |
| Eviction history (Y/N) | Factual court record |
| Collections count + total | Objective financial metric |
| Rent payment history | Objective rental performance |
| Current rent amount | Context for income ratio |
| Reference check results | Objective third-party input |

### Denial Notification to Applicants

When an application is denied, the applicant receives ONLY a generic message. They never see:
- The AI risk score
- The AI factor analysis
- The landlord's internal notes
- The specific denial reason selected by the landlord

Template: "Thank you for your interest in [Property Address]. After careful consideration, we have decided to move forward with another applicant. If you have questions, please contact [Landlord Contact]."

If the denial was based on credit/background check information, the landlord is reminded of their obligation under the FCRA (Fair Credit Reporting Act) to provide an "adverse action notice" with the name of the screening company used. This is handled by a separate notice template.

### State-Specific Compliance (Future)

Many states have additional protections beyond federal Fair Housing (e.g., source of income protection in California, Oregon, and others). The compliance filter is designed to be extensible — a `state_rules` configuration can add additional exclusions per state. Not included in MVP, but the architecture supports it.

## Manual Testing Checklist

### Application Portal
- [ ] `/apply/[property-id]` loads with correct property info (name, address, rent)
- [ ] Invalid property ID shows "Property not found" error
- [ ] Form has 5 sections with working Next/Back navigation
- [ ] Progress bar updates correctly per section
- [ ] Required fields show validation errors when blank
- [ ] Email field validates format
- [ ] Phone field accepts standard formats
- [ ] Income field accepts only numbers
- [ ] Both consent checkboxes required before submit
- [ ] Submit creates application in DB with status "submitted"
- [ ] Confirmation page shows tracking link
- [ ] Confirmation email sent to applicant (when email service is configured)
- [ ] Form works on mobile (thumb-friendly inputs, no horizontal scroll)
- [ ] Cannot submit duplicate application (same email + property within 30 days)

### Applications Dashboard
- [ ] Shows all applications across landlord's properties
- [ ] Applications sorted by newest first (default)
- [ ] Filter by property works
- [ ] Filter by status works
- [ ] Sort by risk score works (after screening)
- [ ] Status badges show correct colors
- [ ] Risk score badge shows correct color range (green/yellow/red)
- [ ] Income ratio displays correctly
- [ ] "No applications" empty state renders when no applications exist
- [ ] Clicking application navigates to detail page
- [ ] Loading state shows skeletons

### Application Detail
- [ ] Breadcrumb navigates back to applications list
- [ ] All applicant info displays correctly
- [ ] Income-to-rent ratio calculated and displayed
- [ ] "Run Screening" button visible for unscreened applications
- [ ] "Run Screening" triggers background check + AI analysis
- [ ] Loading state while screening is in progress
- [ ] After screening: AI report shows risk score, recommendation, factors
- [ ] Risk score color matches range (green 70+, yellow 40-69, red <40)
- [ ] Top 3 factors visible above the fold
- [ ] Collapsible sections expand/collapse correctly
- [ ] Compliance badge always visible
- [ ] Two-column layout on desktop, stacked on mobile

### AI Screening Report
- [ ] Risk score displays as large, prominent element
- [ ] Recommendation badge shows correct text and color
- [ ] All factor categories render correctly
- [ ] Factor signals (positive/neutral/negative) have correct icons and colors
- [ ] Detailed breakdown sections are collapsible
- [ ] Report ID and timestamp displayed
- [ ] No protected-class language appears anywhere in the report

### Approve/Deny Flow
- [ ] "Approve" opens confirmation dialog
- [ ] Approve dialog allows optional message to applicant
- [ ] Confirm approval updates status to "approved"
- [ ] "Deny" opens denial dialog
- [ ] Fair housing reminder card visible in denial dialog
- [ ] Denial reason dropdown required
- [ ] Fair housing compliance checkbox required before confirm
- [ ] Confirm button disabled until checkbox is checked
- [ ] Confirm denial updates status to "denied"
- [ ] Applicant notification sent (approved or denied)
- [ ] Denied applicant receives generic message only (no AI details)
- [ ] Decision logged in audit trail

### Applicant Status Page
- [ ] `/apply/status/[tracking-id]` shows correct status
- [ ] Invalid tracking ID shows "not found" message
- [ ] Timeline shows correct steps completed
- [ ] Approved status shows congratulations message
- [ ] Denied status shows generic message (no details)
- [ ] Pending status shows "under review" message
- [ ] Page works without authentication
- [ ] Page loads on mobile correctly

### Fair Housing Compliance
- [ ] Application form does not ask about protected classes
- [ ] AI prompt does not include applicant name
- [ ] AI prompt does not include any protected-class data
- [ ] AI factors are limited to objective categories only
- [ ] Denial notification to applicant is generic (no AI reasoning)
- [ ] Fair housing reminder shown before every denial confirmation
- [ ] Audit log captures all screening actions
- [ ] Prompt snapshot stored in screening_reports for review

### Edge Cases
- [ ] Applicant submits with minimum required fields only
- [ ] Applicant submits with all optional fields filled
- [ ] Background check returns "failed" status — graceful error handling
- [ ] Background check takes >24 hours — status shows "screening in progress"
- [ ] AI analysis fails — landlord can still make decision manually
- [ ] Landlord has no screening provider configured — shows setup prompt
- [ ] Multiple applications for same property — all display correctly
- [ ] Property deleted while application is pending — graceful handling
- [ ] Landlord tries to approve/deny before screening — blocked or warned

## Tasks

Tasks will be numbered starting from the next available ID in the backlog. Outline only — detailed task files created during implementation.

| # | Tier | Title | Depends On |
|---|------|-------|------------|
| 1 | Haiku | Database migration — applications, screening_reports, screening_audit_log tables | — |
| 2 | Haiku | Database migration — extend landlord_profiles with screening preferences | 1 |
| 3 | Haiku | TypeScript types for applications and screening | — |
| 4 | Sonnet | Application submission API — POST /api/applications (public) | 1, 3 |
| 5 | Sonnet | Applications list API — GET /api/applications (landlord) | 1, 3 |
| 6 | Sonnet | Application detail API — GET /api/applications/[id] | 1, 3 |
| 7 | Sonnet | Application decision API — POST /api/applications/[id]/decide | 1, 3 |
| 8 | Sonnet | Public status API — GET /api/applications/status/[tracking-id] | 1, 3 |
| 9 | Opus | Compliance filter — pre-prompt sanitization module | 3 |
| 10 | Opus | AI screening analysis — Claude integration with sanitized prompt | 9, 6 |
| 11 | Sonnet | Screening provider interface + TransUnion SmartMove adapter | 1 |
| 12 | Sonnet | Screening webhook handler — POST /api/webhooks/screening | 11 |
| 13 | Sonnet | Screening orchestrator — POST /api/applications/[id]/screen | 10, 11 |
| 14 | Haiku | Install missing shadcn components — checkbox, alert | — |
| 15 | Opus | Application portal UI — public multi-section form | 4, 14 |
| 16 | Opus | Applications dashboard UI — filterable list with status badges | 5, 14 |
| 17 | Opus | Application detail + screening report UI — two-column layout | 6, 10, 14 |
| 18 | Opus | Decision dialog UI — approve/deny with fair housing guardrails | 7, 17 |
| 19 | Opus | Applicant status page UI — public timeline view | 8, 14 |
| 20 | Sonnet | Email notification service integration (Resend) | — |
| 21 | Sonnet | Wire email notifications — confirmation, new app, decision | 20, 4, 7 |
| 22 | Sonnet | Sidebar navigation update — add Applications link with badge | 16 |
| 23 | Sonnet | Dashboard stats extension — application count, approval rate | 5 |
| 24 | Haiku | Screening audit log middleware — log all screening actions | 1 |
| 25 | Haiku | Unit tests — application APIs | 4, 5, 6, 7, 8 |
| 26 | Sonnet | Integration tests — full screening pipeline (submit → screen → decide) | 13, 7 |
| 27 | Haiku | Compliance test suite — verify no protected-class data in AI prompts | 9 |

**Tier breakdown**: 5 Haiku, 12 Sonnet, 5 Opus, 5 test tasks
**Dependency graph**: Tasks 1, 3, 14, and 20 are independent foundations. The compliance filter (9) and provider adapter (11) are parallel tracks that converge at the screening orchestrator (13). All UI tasks depend on their corresponding APIs.

```
Independent foundations:
  1 (DB migration) ─┬─→ 2 (extend profiles)
                    ├─→ 4 (submit API) ──→ 15 (portal UI)
                    ├─→ 5 (list API) ───→ 16 (dashboard UI) → 22 (sidebar)
                    ├─→ 6 (detail API) ─→ 17 (detail UI) → 18 (decision UI)
                    ├─→ 7 (decide API) ─→ 18 (decision UI)
                    ├─→ 8 (status API) ─→ 19 (status UI)
                    ├─→ 11 (provider) ──→ 12 (webhook)
                    └─→ 24 (audit log)

  3 (types) ────────┬─→ 4, 5, 6, 7, 8 (all APIs)
                    └─→ 9 (compliance filter) → 10 (AI analysis)

  9 + 11 ───────────→ 13 (screening orchestrator)
  10 + 6 ───────────→ 17 (detail + report UI)

  14 (shadcn install) → 15, 16, 17, 18, 19 (all UI tasks)
  20 (email setup) ──→ 21 (wire notifications)
```

## Open Questions

1. **Background check provider selection** — TransUnion SmartMove is recommended (applicant-initiated, SSN never touches our servers). RentPrep is cheaper but landlord-initiated. Should we support both at launch, or start with SmartMove only and add RentPrep later?
   - **Recommendation**: SmartMove only at launch. The `ScreeningProvider` interface makes it easy to add RentPrep later. Starting with one reduces integration complexity.

2. **Background check cost model** — Who pays for the background check? Options: (a) landlord pays (built into subscription), (b) applicant pays (TransUnion collects directly), (c) landlord pays per-check as add-on.
   - **Recommendation**: Start with applicant-pays (TransUnion's default model). Landlords can offer to reimburse. Add landlord-pays billing in a future tier.

3. **AI screening without background check** — Should the AI analysis work with application data alone (no background check), or require a completed background check?
   - **Recommendation**: Allow AI analysis without background check (income ratio, employment duration, and references are enough for a preliminary score). Background check enhances the report but is not required. This lets landlords try the AI screening for free before paying for background checks.

4. **Adverse action notice (FCRA compliance)** — If a denial is based on credit report data, the FCRA requires an "adverse action notice" to the applicant. Should Liz auto-generate this, or remind the landlord to send it manually?
   - **Recommendation**: Auto-generate the notice as part of the denial flow. Include the screening company name, their contact info, and the applicant's right to dispute. This is a significant legal risk if missed — better to handle it automatically.

5. **Multi-property applications** — Can an applicant apply to multiple properties from the same landlord? If so, should screening results be shared across applications?
   - **Recommendation**: Yes, allow multiple applications. Share background check results (to avoid duplicate costs) but run separate AI analyses per property (rent amounts differ, so income ratios differ). Link via applicant email.

6. **Comparative analysis** — The landlord wants to compare 3 applicants side-by-side. Build a comparison view, or is the dashboard with sort-by-risk-score sufficient for MVP?
   - **Recommendation**: Sort-by-risk-score is sufficient for MVP. Add a dedicated comparison drawer/modal in a fast-follow. The component hierarchy includes a `CompareDrawer` placeholder for this.

7. **State-specific fair housing laws** — Several states add protections beyond federal (e.g., source of income in California). Should the compliance filter be state-aware at launch?
   - **Recommendation**: Not at launch. Note it in the UI ("Check your local fair housing laws"). Add state-specific rules configuration as a Phase 3 enhancement. The compliance filter architecture supports per-state rules — it just needs the rule data.

8. **Data retention** — How long do we keep application data and screening reports? FCRA requires some data be kept for a minimum period. State laws may impose maximum retention periods.
   - **Recommendation**: Default 3-year retention (aligns with common FCRA guidance). Add configurable retention policy per landlord in a future update. Mark this for legal review before production launch.
