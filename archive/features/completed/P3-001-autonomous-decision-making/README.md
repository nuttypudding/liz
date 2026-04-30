# Feature: Autonomous Decision-Making

**ID**: P3-001
**Ticket**: T-008
**Phase**: 3 — Full Vision

## TL;DR

Enable full AI autonomy for routine maintenance decisions. The AI evaluates incoming requests against the landlord's historical patterns, decision profile, and safety rails, then acts on its own — dispatching vendors, approving costs, and notifying tenants. The landlord reviews decisions after the fact rather than before. This is the "Full Autopilot" delegation mode promised (and disabled as "Coming soon") during P1-003 onboarding.

## Summary

Phases 1 and 2 built the foundation: P1-003 gave the AI a decision profile (risk appetite, delegation mode, auto-approve threshold), and P2-003 added explicit rule-based automation ("if plumbing and under $200, auto-approve with Preferred Plumber"). But rules are explicit and finite — landlords can't anticipate every scenario.

P3-001 introduces **implicit decision-making**. The AI learns what a landlord would decide by analyzing:

1. **Decision profile** — risk appetite, spending comfort, delegation mode
2. **Historical decisions** — patterns of what the landlord approved, rejected, and modified across all past requests
3. **Rule patterns** — extrapolates intent from existing automation rules (e.g., "you auto-approve plumbing under $200, so you'd likely approve HVAC under $200 from the same vendor tier")
4. **Market context** — typical repair costs for the category, vendor ratings, seasonal patterns

The key differentiator from P2-003: rules say "if X then Y"; autonomy says "based on everything I know about you, here's what you'd want." When the AI is confident enough, it acts. When it isn't, it escalates.

Safety is the primary design constraint. Every autonomous decision has:
- A confidence score that must exceed a configurable threshold
- Spending limits (per-decision and per-period)
- Category exclusions (landlord can exempt emergency, structural, etc.)
- A full reasoning chain visible to the landlord
- Retroactive override capability (landlord can undo any AI decision)
- An audit trail that feeds back into the learning model

## User Stories

### Landlord

- As a landlord, I want to enable "Full Autopilot" mode so routine maintenance decisions happen without me needing to approve each one individually.
- As a landlord, I want to see a feed of every decision the AI made on my behalf so I can review them at my convenience.
- As a landlord, I want to set spending limits (per-decision and monthly) so the AI never commits more money than I'm comfortable with.
- As a landlord, I want to exclude specific categories from autonomy (e.g., always escalate structural issues to me) so I maintain control over high-stakes decisions.
- As a landlord, I want to set a confidence threshold so the AI only acts when it's sufficiently sure about the right course of action.
- As a landlord, I want to see the AI's reasoning for every autonomous decision — what similar past decisions it referenced, why it chose that vendor, why it approved that cost.
- As a landlord, I want to override any autonomous decision after the fact and have my override improve future AI behavior.
- As a landlord, I want a monthly summary of autonomous activity — decisions made, money spent, escalations, and my override rate — so I can calibrate trust over time.
- As a landlord, I want a "Pause Autopilot" button that instantly stops all autonomous actions and reverts to assist mode.

### Tenant

- As a tenant, I want faster maintenance responses when my landlord has autopilot enabled, since the AI can dispatch a vendor without waiting for manual approval.
- As a tenant, I want to know when the AI acted vs. when my landlord personally reviewed my request.

## Architecture

### Decision Engine

The autonomous decision engine is a server-side pipeline that intercepts classified maintenance requests when the landlord has `delegation_mode = 'auto'`.

```
Maintenance Request Submitted
        |
        v
AI Classification (existing P1-001 route)
        |
        v
[delegation_mode check]
        |
   +---------+----------+-----------+
   |         |          |           |
 manual    assist      auto        |
   |         |          |           |
   v         v          v           |
 (existing) (existing) Decision    |
                       Engine      |
                         |         |
                    +----+----+    |
                    |         |    |
              Confident?  No  +----+-> Escalate to landlord
                    |                   (fallback to assist)
                  Yes
                    |
                    v
              Safety Rails Check
                    |
              +-----+-----+
              |           |
            Pass         Fail -> Escalate to landlord
              |
              v
        Execute Decision
        (dispatch vendor, notify tenant)
              |
              v
        Log to Audit Trail
              |
              v
        Add to Decision Feed
```

### Confidence Scoring

The AI produces a confidence score (0.0 to 1.0) for each autonomous decision based on weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Historical match | 35% | How closely this request matches previously approved requests (category, cost range, property, urgency) |
| Rule alignment | 25% | Whether existing automation rules would cover this or a similar scenario |
| Cost predictability | 20% | How well the estimated cost falls within the landlord's typical approval range |
| Vendor availability | 10% | Whether a preferred/priority vendor is available for this category |
| Profile alignment | 10% | How well the action aligns with risk appetite (speed_first landlords get higher confidence for fast-dispatch decisions) |

The landlord sets a **confidence threshold** (default: 0.80). The AI only acts autonomously when its confidence score exceeds this threshold. Below that, it escalates to the landlord with its reasoning attached.

### Safety Rails

Safety rails are hard limits that cannot be overridden by confidence alone.

| Rail | Default | Configurable | Description |
|------|---------|-------------|-------------|
| Per-decision spending cap | $500 | Yes | AI never auto-approves above this amount |
| Monthly spending cap | $2,000 | Yes | AI stops acting once cumulative monthly autonomous spend reaches this limit |
| Category exclusions | `[emergency, structural]` | Yes | These categories always escalate regardless of confidence |
| Emergency escalation | Always on | No | Emergency-urgency requests always notify the landlord immediately, even if auto-dispatched |
| Vendor restriction | Preferred only | Yes | AI can only dispatch to vendors marked as preferred (or any vendor, if configured) |
| Cooldown after override | 3 similar | No | After landlord overrides a decision, AI pauses autonomous action on similar requests until 3 manual approvals confirm the new pattern |
| Rollback window | 2 hours | Yes | Landlord can fully reverse an autonomous decision within this window |

### Feedback Loop

Landlord interactions feed back into the confidence model:

```
Landlord approves autonomous decision
  -> +weight for similar future decisions

Landlord overrides autonomous decision
  -> -weight for similar future decisions
  -> cooldown on that pattern
  -> reasoning updated

Landlord adjusts settings
  -> immediate threshold/limit changes
  -> no retraining needed
```

## Tech Approach

### Decision Engine (API Route)

New API route: `POST /api/autonomy/evaluate`

Called internally after classification when `delegation_mode = 'auto'`. This is not a public endpoint — it is invoked by the classify/dispatch pipeline.

Implementation:
- Read landlord profile (existing `landlord_profiles` table)
- Read autonomy settings (new `autonomy_settings` table)
- Query historical decisions for similarity matching (existing `maintenance_requests` with new `autonomous_decisions` join)
- Query automation rules for alignment check (existing `automation_rules` from P2-003)
- Compute confidence score via Claude API prompt with structured output
- Check against safety rails
- If confident + safe: execute dispatch, log decision, return `{ acted: true, decision_id }`
- If not: return `{ acted: false, reason, confidence }` and the request proceeds to landlord queue

The confidence scoring prompt sends the landlord's history and profile to Claude (Sonnet) with a structured JSON output schema. This is a single API call per request evaluation — not a multi-step agent loop. Cost per evaluation: ~$0.003-0.01 depending on history size.

### Autonomy Settings (Extension of Settings Page)

New tab in `/settings`: "Autopilot." Extends the existing settings page (P1-003) with granular controls:

- Confidence threshold slider (0.50 to 0.95, step 0.05, default 0.80)
- Per-decision spending cap (numeric input, default $500)
- Monthly spending cap (numeric input, default $2,000)
- Category exclusions (multi-select checkboxes for the 7 categories)
- Vendor restriction toggle (preferred only vs. any vendor)
- Rollback window selector (1h, 2h, 4h, 12h, 24h)

Stored in a new `autonomy_settings` table (1:1 with `landlord_profiles`).

### Decision Feed (New Page)

New page: `/autopilot` (or `/dashboard/autopilot`)

A reverse-chronological feed of autonomous decisions. Each entry is an expandable card showing:
- Timestamp, request summary, confidence score
- Action taken (vendor dispatched, cost approved)
- Expand to see full reasoning chain
- Retroactive approve/reject buttons
- Status badge: "AI Acted", "Landlord Confirmed", "Landlord Overridden"

### AI Reasoning Card (Extension of Request Detail)

On `/requests/[id]`, when the request was handled autonomously, a new card appears in the right column between the AI Classification Card and the Cost Estimate Card:

```
AI Reasoning (Autopilot)
------------------------
Decision: Dispatched to Mike's Plumbing
Confidence: 0.87

Why I acted:
- Similar to request #47 (leaky faucet, $120) which you approved
- Cost estimate ($95-$140) is under your $500 per-decision cap
- Mike's Plumbing is your preferred plumber (priority #1)
- Your monthly autopilot spend is $340 of $2,000 limit

[Override] [Confirm]
```

### Monthly Report

New API route: `GET /api/autonomy/report?month=YYYY-MM`

Returns aggregated stats for the month. Rendered as a dedicated page (`/autopilot/report`) or a modal/section within the autopilot dashboard.

Metrics:
- Total autonomous decisions
- Total autonomous spend
- Average confidence score
- Decisions by category (pie/bar chart)
- Escalation count (decisions the AI chose not to make)
- Landlord override count and override rate
- Trend comparison vs. previous month

## UI Development Process

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design autopilot-dashboard          # Plan autonomy dashboard + decision feed
/ui-build autopilot-dashboard           # Build from plan
/ux-design autonomy-settings            # Plan settings tab extension
/ui-build autonomy-settings             # Build from plan
/ux-design ai-reasoning-card            # Plan reasoning card for request detail
/ui-build ai-reasoning-card             # Build from plan
/ux-design monthly-autonomy-report      # Plan report page
/ui-build monthly-autonomy-report       # Build from plan
/ui-refine AutonomyDashboard            # Polish
/ui-refine AutonomySettings             # Polish
/ui-refine AiReasoningCard              # Polish
/ui-refine MonthlyAutonomyReport        # Polish
```

### Screen 1: Autonomy Dashboard (`/autopilot`)

**Purpose**: Central command center for the landlord to monitor and manage AI autonomous activity. This is the landing page for autopilot mode.

**Layout**: Full-width within the `(landlord)` layout. Top summary strip, then decision feed below.

**Component Hierarchy**:

```
AutopilotPage (apps/web/app/(landlord)/autopilot/page.tsx)
├── PageHeader ("Autopilot")
│   └── PauseAutopilotButton (top-right action)
│       ├── Pause icon + "Pause Autopilot" (when active)
│       └── Play icon + "Resume Autopilot" (when paused)
│
├── AutopilotStatusBanner
│   ├── When active: green "Autopilot Active" with pulse indicator
│   ├── When paused: amber "Autopilot Paused — all requests require manual approval"
│   └── When not enabled: "Enable autopilot in Settings"
│
├── AutopilotSummaryStrip (horizontal stat cards, scroll on mobile)
│   ├── StatCard: "Decisions This Month" — count + trend arrow
│   ├── StatCard: "Spend This Month" — $X of $Y limit + progress bar
│   ├── StatCard: "Avg Confidence" — 0.XX with color coding
│   └── StatCard: "Override Rate" — X% with color coding
│
├── DecisionFeed (main content area)
│   ├── FeedFilters (row of filter pills)
│   │   ├── FilterPill: "All" | "AI Acted" | "Confirmed" | "Overridden" | "Escalated"
│   │   └── DateRangeSelector (optional, secondary)
│   │
│   └── DecisionFeedList (virtualized list)
│       └── DecisionFeedItem (repeated, expandable)
│           ├── Collapsed view:
│           │   ├── Timestamp
│           │   ├── Request summary (category icon + one-line description)
│           │   ├── Action taken (e.g., "Dispatched to Mike's Plumbing")
│           │   ├── Cost badge ($95-$140)
│           │   ├── ConfidenceBadge (0.87, color-coded)
│           │   └── StatusBadge ("AI Acted" | "Confirmed" | "Overridden")
│           │
│           └── Expanded view (accordion):
│               ├── ReasoningChain (bulleted list of factors)
│               ├── SimilarDecisionReference (link to historical request)
│               ├── SpendImpact ("$340 of $2,000 monthly limit used")
│               └── ActionButtons:
│                   ├── "Confirm" (green) — landlord agrees
│                   ├── "Override" (red) — opens override dialog
│                   └── "View Request" (ghost) — links to /requests/[id]
│
└── ViewMonthlyReportLink ("View full monthly report ->")
```

**shadcn Components**:

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Summary cards, feed items |
| `button` | Installed | Pause/resume, confirm/override actions |
| `badge` | Installed | Confidence score, status, cost |
| `accordion` | Installed | Expandable decision feed items |
| `progress` | Installed | Monthly spend limit bar |
| `separator` | Installed | Feed item dividers |
| `toggle-group` | **Needs install** | Feed filter pills |
| `dialog` | Installed | Override confirmation dialog |
| `alert` | Installed | Status banner |
| `skeleton` | Installed | Loading states |
| `scroll-area` | Installed | Summary strip horizontal scroll on mobile |

**Responsive Design**:
- **Mobile**: Summary strip scrolls horizontally. Feed items stack full-width. Expanded reasoning uses full width. Action buttons are full-width stacked.
- **Tablet**: Summary strip is a 2x2 grid. Feed items have more horizontal space for inline badges.
- **Desktop**: Summary strip is a single row of 4 cards. Feed items show collapsed info in a single row with expand on click.

**User Flow**:
1. Landlord navigates to `/autopilot` from sidebar
2. Sees status banner (active/paused) and summary stats at a glance
3. Scrolls through decision feed to review recent AI actions
4. Taps a decision to expand and read the reasoning
5. Confirms or overrides the decision
6. If override: dialog asks for reason (optional free text), which feeds back into the model

### Screen 2: Decision Feed (integrated into Autonomy Dashboard)

The decision feed is the primary content area of the Autonomy Dashboard (Screen 1). It is not a separate page but the core scrollable list within `/autopilot`. See the `DecisionFeed` component hierarchy above.

**Key Interactions**:
- **Expand/collapse**: Accordion pattern. Only one item expanded at a time (optional — could allow multiple).
- **Confirm**: Single click sets status to "Confirmed." Inline toast notification. Item badge updates.
- **Override**: Opens dialog with:
  - Current AI decision summary
  - "What would you have done instead?" free text
  - Optional: select the correct vendor / adjust cost
  - "Override" button (destructive) — sets status to "Overridden," sends rollback if within window, updates model
- **Pagination**: Infinite scroll with 20-item pages. Skeleton items appear while loading next page.
- **Empty state**: "No autonomous decisions yet. When autopilot is active, AI decisions will appear here."

### Screen 3: Autonomy Settings (extends `/settings`)

**Purpose**: Granular controls for autonomous behavior. New "Autopilot" tab added to the existing settings page.

**Component Hierarchy**:

```
SettingsPage (existing: apps/web/app/(landlord)/settings/page.tsx)
├── Tabs (existing)
│   ├── "AI Preferences" tab (existing)
│   ├── "Autopilot" tab (NEW)
│   │   ├── AutopilotEnableCard
│   │   │   ├── Toggle switch: "Enable Full Autopilot"
│   │   │   ├── Description text explaining what autopilot does
│   │   │   └── Warning: "When enabled, AI will act on your behalf for routine decisions"
│   │   │
│   │   ├── ConfidenceThresholdCard
│   │   │   ├── Label: "Minimum confidence to act"
│   │   │   ├── Slider: 0.50 to 0.95, step 0.05
│   │   │   ├── Current value display with color coding
│   │   │   │   - 0.50-0.65: red "Low — AI will act on most requests"
│   │   │   │   - 0.70-0.80: amber "Moderate — AI acts on clear-cut cases"
│   │   │   │   - 0.85-0.95: green "High — AI only acts when very confident"
│   │   │   └── Helper text: "Higher = fewer autonomous actions, more escalations"
│   │   │
│   │   ├── SpendingLimitsCard
│   │   │   ├── Per-decision cap (numeric input with $ prefix)
│   │   │   │   └── Helper: "AI will never approve a single job above this amount"
│   │   │   ├── Monthly cap (numeric input with $ prefix)
│   │   │   │   └── Helper: "AI stops acting once this total is reached for the month"
│   │   │   └── Current month spend indicator: "$X of $Y used"
│   │   │
│   │   ├── CategoryExclusionsCard
│   │   │   ├── Description: "AI will always escalate these categories to you"
│   │   │   └── CheckboxGrid (7 categories):
│   │   │       ├── [ ] Plumbing
│   │   │       ├── [ ] Electrical
│   │   │       ├── [ ] HVAC
│   │   │       ├── [x] Structural (default excluded)
│   │   │       ├── [ ] Pest
│   │   │       ├── [ ] Appliance
│   │   │       └── [ ] General
│   │   │
│   │   ├── VendorRestrictionCard
│   │   │   ├── Toggle: "Only dispatch to preferred vendors"
│   │   │   └── Helper: "When off, AI may choose non-preferred vendors if no preferred vendor is available"
│   │   │
│   │   └── RollbackWindowCard
│   │       ├── Select: 1h, 2h, 4h, 12h, 24h
│   │       └── Helper: "Time window during which you can fully reverse an autonomous decision"
│   │
│   └── "Notifications" tab (existing)
└── Save button (existing)
```

**shadcn Components** (additional to existing settings):

| Component | Status | Use |
|-----------|--------|-----|
| `switch` | Installed | Autopilot enable toggle, vendor restriction |
| `slider` | Installed | Confidence threshold |
| `input` | Installed | Spending cap inputs |
| `checkbox` | Installed | Category exclusion checkboxes |
| `select` | Installed | Rollback window dropdown |
| `alert` | Installed | Warning about enabling autopilot |
| `tooltip` | Installed | Helper text on hover for compact layouts |

**Responsive Design**:
- **Mobile**: Cards stack vertically, full-width. Checkbox grid is 2 columns. Spending inputs are full-width.
- **Desktop**: Cards stack vertically within the tab content area. Checkbox grid is 3-4 columns.

**User Flow**:
1. Landlord navigates to `/settings` and selects "Autopilot" tab
2. Toggles "Enable Full Autopilot" — confirmation dialog appears
3. Adjusts confidence threshold (slider provides real-time feedback)
4. Sets spending limits
5. Checks/unchecks category exclusions
6. Saves — toast confirms, delegation_mode updated to 'auto'

### Screen 4: AI Reasoning Card (on `/requests/[id]`)

**Purpose**: When the AI acted autonomously on a request, show the complete reasoning chain so the landlord understands why.

**Placement**: Right column of the request detail page, between `AiClassificationCard` and `CostEstimateCard`.

**Component Hierarchy**:

```
RequestDetailPage (existing: apps/web/app/(landlord)/requests/[id]/page.tsx)
├── ... (existing left column)
└── Right column (existing)
    ├── AiClassificationCard (existing)
    │
    ├── AiReasoningCard (NEW — only visible when request.autonomous_decision exists)
    │   ├── CardHeader
    │   │   ├── Bot icon + "AI Reasoning (Autopilot)"
    │   │   └── ConfidenceBadge (0.87, color-coded)
    │   │
    │   ├── CardContent
    │   │   ├── DecisionSummary
    │   │   │   ├── "Decision: Dispatched to {vendor_name}"
    │   │   │   └── "Approved cost: ${estimate_low}–${estimate_high}"
    │   │   │
    │   │   ├── ReasoningList (numbered or bulleted)
    │   │   │   ├── "Similar to request #{ref_id} ({category}, ${cost}) which you approved"
    │   │   │   ├── "Cost estimate (${low}–${high}) under your ${cap} per-decision cap"
    │   │   │   ├── "{vendor} is your preferred {specialty} vendor (priority #{rank})"
    │   │   │   ├── "Monthly autopilot spend: ${current} of ${limit}"
    │   │   │   └── (additional factors as returned by the decision engine)
    │   │   │
    │   │   └── SafetyRailsSummary (collapsed by default)
    │   │       ├── "Per-decision cap: ${cap} -- PASS"
    │   │       ├── "Monthly cap: ${current}/${limit} -- PASS"
    │   │       ├── "Category exclusion: {category} -- NOT EXCLUDED"
    │   │       └── "Confidence threshold: {score} >= {threshold} -- PASS"
    │   │
    │   └── CardFooter
    │       ├── ConfirmButton ("Looks good", ghost/success)
    │       ├── OverrideButton ("Override", ghost/destructive)
    │       └── Timestamp: "AI acted {relative_time}"
    │
    ├── CostEstimateCard (existing)
    ├── VendorSelector (existing — read-only when autonomous)
    └── ApproveButton (existing — replaced with override controls when autonomous)
```

**shadcn Components**:

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Container |
| `badge` | Installed | Confidence score |
| `collapsible` | Installed | Safety rails details |
| `button` | Installed | Confirm/override actions |
| `separator` | Installed | Section dividers |

**Responsive Design**:
- **Mobile**: Card appears full-width below the AI Classification card. Reasoning list is compact with smaller text.
- **Desktop**: Card appears in the sticky right column. All content visible without scrolling for typical reasoning chains (4-5 items).

**User Flow**:
1. Landlord opens a request that was handled by autopilot
2. Sees the standard AI classification + the new AI Reasoning card
3. Reads the reasoning chain — understands why the AI acted
4. Optionally expands safety rails summary for full audit detail
5. Clicks "Looks good" to confirm or "Override" to reverse
6. If override: same dialog as in the decision feed

### Screen 5: Monthly Autonomy Report (`/autopilot/report`)

**Purpose**: End-of-month summary of all autonomous activity. Helps landlords calibrate trust and adjust settings.

**Component Hierarchy**:

```
AutopilotReportPage (apps/web/app/(landlord)/autopilot/report/page.tsx)
├── PageHeader ("Monthly Autopilot Report")
│   └── MonthSelector (dropdown: current month, previous months)
│
├── ReportSummaryStrip (key metrics in a row)
│   ├── MetricCard: "Total Decisions" — large number
│   ├── MetricCard: "Total Spend" — $X (with comparison to previous month)
│   ├── MetricCard: "Escalated" — count (decisions AI chose not to make)
│   └── MetricCard: "Override Rate" — X% (with trend arrow and color)
│
├── SpendBreakdownChart
│   ├── Bar chart or stacked bar: autonomous spend by category
│   └── Horizontal line: monthly cap for reference
│
├── DecisionsByCategoryChart
│   ├── Donut/pie chart: decisions grouped by category
│   └── Legend with counts
│
├── ConfidenceDistributionChart
│   ├── Histogram: distribution of confidence scores for decisions made
│   └── Vertical line: current threshold for reference
│
├── TopDecisionsTable
│   ├── "Highest confidence decisions" (top 5, expanded reasoning)
│   └── "Overridden decisions" (all overrides, with landlord feedback)
│
├── TrustScoreCard
│   ├── "Liz Trust Score" — composite metric
│   │   └── Based on: override rate, escalation rate, average confidence
│   ├── Trend: "Improving" | "Stable" | "Declining"
│   └── Recommendation: "Consider raising your confidence threshold" or "Your autopilot is well-calibrated"
│
└── AdjustSettingsLink ("Adjust autopilot settings ->")
```

**shadcn Components**:

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Metric cards, chart containers |
| `select` | Installed | Month selector |
| `table` | Installed | Top decisions table |
| `badge` | Installed | Category badges, status badges |
| `separator` | Installed | Section dividers |
| `chart` | **Needs install** | Bar chart, donut chart, histogram |

**Responsive Design**:
- **Mobile**: Metric strip scrolls horizontally or stacks as 2x2. Charts are full-width, stacked vertically. Table scrolls horizontally.
- **Desktop**: Metric strip is a single row. Charts arranged in a 2-column grid. Table is full-width.

**User Flow**:
1. Landlord clicks "View full monthly report" from `/autopilot` or navigates directly
2. Sees the current month's summary at a glance
3. Reviews spend breakdown and category distribution charts
4. Checks the overridden decisions table to see where AI diverged from expectations
5. Reads the trust score and recommendation
6. Clicks through to settings if adjustments are needed

## Data Model

### New Table: `autonomy_settings`

```sql
create table autonomy_settings (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null unique,  -- Clerk user ID (1:1 with landlord_profiles)

  -- Confidence
  confidence_threshold decimal(3,2) not null default 0.80,
    -- 0.50 to 0.95 — AI only acts when confidence >= this value

  -- Spending limits
  per_decision_cap decimal(10,2) not null default 500.00,
  monthly_cap decimal(10,2) not null default 2000.00,

  -- Category exclusions (stored as JSON array of category strings)
  excluded_categories jsonb not null default '["emergency", "structural"]'::jsonb,
    -- Categories where AI always escalates to landlord

  -- Vendor restrictions
  preferred_vendors_only boolean not null default true,
    -- When true, AI only dispatches to vendors with preferred=true

  -- Rollback
  rollback_window_hours int not null default 2,
    -- Hours during which landlord can fully reverse an autonomous decision

  -- Pause state
  paused boolean not null default false,
    -- When true, AI falls back to assist mode regardless of delegation_mode
  paused_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_autonomy_settings_landlord on autonomy_settings(landlord_id);
```

### New Table: `autonomous_decisions`

```sql
create table autonomous_decisions (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,  -- Clerk user ID
  request_id uuid not null references maintenance_requests,

  -- Decision details
  action_type text not null,
    -- 'dispatch' | 'approve_cost' | 'escalate'
  vendor_id uuid references vendors,
  approved_cost_low decimal(10,2),
  approved_cost_high decimal(10,2),
  work_order_text text,

  -- Confidence scoring
  confidence_score decimal(3,2) not null,
  confidence_breakdown jsonb not null,
    -- { historical_match: 0.90, rule_alignment: 0.85, cost_predictability: 0.80,
    --   vendor_availability: 1.0, profile_alignment: 0.75 }

  -- Reasoning chain (human-readable, generated by Claude)
  reasoning jsonb not null,
    -- [ "Similar to request #47 (leaky faucet, $120) which you approved",
    --   "Cost estimate ($95-$140) under your $500 per-decision cap",
    --   "Mike's Plumbing is your preferred plumber (priority #1)",
    --   "Monthly autopilot spend: $340 of $2,000 limit" ]

  -- Safety rails audit
  safety_rails_result jsonb not null,
    -- { per_decision_cap: "pass", monthly_cap: "pass",
    --   category_exclusion: "pass", confidence_threshold: "pass",
    --   vendor_restriction: "pass" }

  -- Reference decisions (historical requests the AI based its decision on)
  reference_request_ids uuid[] default '{}',

  -- Landlord review
  review_status text not null default 'pending',
    -- 'pending' | 'confirmed' | 'overridden'
  reviewed_at timestamptz,
  override_reason text,
    -- Free text from landlord explaining the override
  override_action jsonb,
    -- What the landlord did instead: { vendor_id, notes, ... }

  -- Rollback tracking
  rollback_eligible_until timestamptz not null,
  rolled_back boolean not null default false,
  rolled_back_at timestamptz,

  created_at timestamptz default now()
);

create index idx_autonomous_decisions_landlord on autonomous_decisions(landlord_id);
create index idx_autonomous_decisions_request on autonomous_decisions(request_id);
create index idx_autonomous_decisions_review on autonomous_decisions(landlord_id, review_status);
create index idx_autonomous_decisions_created on autonomous_decisions(landlord_id, created_at desc);
```

### New Table: `autonomy_monthly_stats` (materialized/cached)

```sql
create table autonomy_monthly_stats (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,
  month date not null,  -- First day of the month (e.g., '2026-04-01')

  total_decisions int not null default 0,
  total_spend decimal(10,2) not null default 0,
  total_escalations int not null default 0,
  total_overrides int not null default 0,
  avg_confidence decimal(3,2) not null default 0,

  -- Breakdown by category (JSON for flexibility)
  decisions_by_category jsonb not null default '{}'::jsonb,
    -- { "plumbing": 5, "electrical": 2, "hvac": 1, ... }
  spend_by_category jsonb not null default '{}'::jsonb,
    -- { "plumbing": 600.00, "electrical": 200.00, ... }

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(landlord_id, month)
);

create index idx_autonomy_monthly_stats_landlord_month
  on autonomy_monthly_stats(landlord_id, month desc);
```

### Modify Existing Table: `landlord_profiles`

No schema changes needed. The `delegation_mode = 'auto'` value is already defined but was disabled in the UI. P3-001 enables it.

### Modify Existing Table: `maintenance_requests`

```sql
alter table maintenance_requests
  add column autonomous_decision_id uuid references autonomous_decisions,
  add column acted_autonomously boolean not null default false;
```

### TypeScript Types

```typescript
export interface AutonomySettings {
  id: string;
  landlord_id: string;
  confidence_threshold: number;
  per_decision_cap: number;
  monthly_cap: number;
  excluded_categories: string[];
  preferred_vendors_only: boolean;
  rollback_window_hours: number;
  paused: boolean;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutonomousDecision {
  id: string;
  landlord_id: string;
  request_id: string;
  action_type: 'dispatch' | 'approve_cost' | 'escalate';
  vendor_id: string | null;
  approved_cost_low: number | null;
  approved_cost_high: number | null;
  work_order_text: string | null;
  confidence_score: number;
  confidence_breakdown: {
    historical_match: number;
    rule_alignment: number;
    cost_predictability: number;
    vendor_availability: number;
    profile_alignment: number;
  };
  reasoning: string[];
  safety_rails_result: Record<string, 'pass' | 'fail'>;
  reference_request_ids: string[];
  review_status: 'pending' | 'confirmed' | 'overridden';
  reviewed_at: string | null;
  override_reason: string | null;
  override_action: Record<string, unknown> | null;
  rollback_eligible_until: string;
  rolled_back: boolean;
  rolled_back_at: string | null;
  created_at: string;
  // Joined relations (for feed/detail views)
  maintenance_requests?: MaintenanceRequest;
  vendors?: Vendor;
}

export interface AutonomyMonthlyStats {
  id: string;
  landlord_id: string;
  month: string;
  total_decisions: number;
  total_spend: number;
  total_escalations: number;
  total_overrides: number;
  avg_confidence: number;
  decisions_by_category: Record<string, number>;
  spend_by_category: Record<string, number>;
}

export interface ConfidenceBreakdown {
  historical_match: number;
  rule_alignment: number;
  cost_predictability: number;
  vendor_availability: number;
  profile_alignment: number;
}

export interface DecisionFeedItem extends AutonomousDecision {
  request_summary: {
    category: string;
    urgency: string;
    tenant_message: string;
    property_name: string;
    tenant_name: string;
  };
  vendor_name: string | null;
}

export interface MonthlyReportData {
  stats: AutonomyMonthlyStats;
  previous_month_stats: AutonomyMonthlyStats | null;
  top_confident_decisions: AutonomousDecision[];
  overridden_decisions: AutonomousDecision[];
  trust_score: number;
  trust_trend: 'improving' | 'stable' | 'declining';
  recommendation: string;
}
```

## Integration Points

### 1. AI Classification Pipeline (`/api/classify` -> `/api/autonomy/evaluate`)

After the existing classification route produces `ai_category`, `ai_urgency`, `ai_recommended_action`, and `ai_confidence_score`, the pipeline checks `delegation_mode`:

- `manual`: No change. Landlord reviews in queue.
- `assist`: No change. Existing auto-approve logic for jobs under threshold.
- `auto`: Call `/api/autonomy/evaluate` internally. If the decision engine acts, the request skips the landlord queue entirely. If it escalates, the request enters the queue with the AI's reasoning attached.

```typescript
// In /api/classify (or a post-classification middleware)
if (profile.delegation_mode === 'auto') {
  const settings = await getAutonomySettings(profile.landlord_id);
  if (!settings.paused) {
    const result = await evaluateAutonomousDecision({
      request,
      profile,
      settings,
      vendors,
      history,
    });
    if (result.acted) {
      // Request is now dispatched. Update status, log decision.
      return;
    }
    // Else: escalated. Attach reasoning to request for landlord review.
  }
}
```

### 2. Dispatch Pipeline (`/api/requests/[id]/dispatch`)

When the decision engine acts, it calls the existing dispatch logic internally — same vendor assignment, work order generation, and status updates. The dispatch route gains an optional `autonomous_decision_id` field to link the dispatch to its decision record.

### 3. Settings Page (`/settings`)

The existing settings page (P1-003) adds a third tab: "Autopilot." The "Full autopilot" option in the "Delegation Mode" section on the "AI Preferences" tab is no longer disabled — selecting it:
1. Enables the delegation_mode = 'auto' on the profile
2. Creates an `autonomy_settings` row with defaults (if not exists)
3. Redirects focus to the "Autopilot" tab for configuration

### 4. Request Detail Page (`/requests/[id]`)

When `request.acted_autonomously === true`:
- The `AiReasoningCard` component appears in the right column
- The `ApproveButton` is replaced with "Confirm" / "Override" buttons
- The `VendorSelector` becomes read-only (vendor was already dispatched)
- A banner at the top indicates: "This request was handled by Autopilot"

### 5. Dashboard (`/dashboard`)

- New sidebar link: "Autopilot" with a Bot icon
- If autopilot is active, the dashboard summary cards include an "Autopilot Active" indicator
- The emergency alert banner works independently of autopilot (emergencies always notify)

### 6. Sidebar Navigation

Add "Autopilot" link to the `(landlord)` layout sidebar, between "Vendors" and "Settings":
- Icon: Bot (from lucide-react)
- Badge: count of pending-review autonomous decisions (optional)

### 7. Notification Integration

When the AI acts autonomously:
- If `notify_emergencies` and urgency is emergency: push notification immediately (even though auto-dispatched)
- If `notify_all_requests`: push notification for every autonomous action
- Default (neither): no notification — landlord reviews in the decision feed at their convenience

### 8. Clerk Webhook (`/api/webhooks/clerk`)

No changes needed. New users still get `delegation_mode = 'assist'` by default. Autopilot requires explicit opt-in.

## Manual Testing Checklist

### Enabling Autopilot

- [ ] `/settings` shows "Autopilot" tab when feature is available
- [ ] Selecting "Full autopilot" in delegation mode enables the autopilot tab
- [ ] Confirmation dialog appears when enabling autopilot for the first time
- [ ] Default autonomy settings are created: threshold 0.80, per-decision $500, monthly $2,000
- [ ] Default category exclusions: structural and emergency
- [ ] Toggling "Pause Autopilot" on the dashboard immediately stops autonomous actions
- [ ] Pausing reverts to assist mode behavior without changing delegation_mode

### Autonomous Decision Flow

- [ ] Submit a maintenance request (as tenant) when landlord has autopilot enabled
- [ ] AI classifies the request and the decision engine evaluates it
- [ ] For a routine plumbing request with a preferred vendor: AI dispatches automatically
- [ ] Request status updates to "dispatched" without landlord interaction
- [ ] Decision appears in the `/autopilot` feed with correct confidence and reasoning
- [ ] Decision appears on `/requests/[id]` with the AI Reasoning card

### Confidence Gating

- [ ] Set confidence threshold to 0.95 — most requests escalate instead of auto-acting
- [ ] Set confidence threshold to 0.50 — most requests are handled autonomously
- [ ] Requests that fall below threshold appear in the landlord's normal queue
- [ ] Escalated requests include the AI's reasoning and confidence score

### Spending Limits

- [ ] Set per-decision cap to $100 — requests with estimates above $100 escalate
- [ ] Set monthly cap to $500 — after $500 in autonomous spend, all new requests escalate
- [ ] Monthly cap progress bar on `/autopilot` shows accurate running total
- [ ] Reaching the monthly cap shows an alert: "Monthly autopilot limit reached"

### Category Exclusions

- [ ] Exclude "plumbing" — plumbing requests always escalate even if high confidence
- [ ] Include all categories — no forced escalations by category
- [ ] Emergency-urgency requests always notify landlord even if auto-dispatched

### Decision Review

- [ ] Expand a decision in the feed — see full reasoning chain
- [ ] Click "Confirm" — status updates to "Confirmed," toast appears
- [ ] Click "Override" — dialog opens with free-text reason field
- [ ] After override: request status rolls back (if within rollback window)
- [ ] After override: AI pauses autonomous action on similar requests (cooldown)

### AI Reasoning Card

- [ ] On `/requests/[id]` for an autonomous request: AI Reasoning card is visible
- [ ] Card shows confidence score, decision summary, reasoning bullets
- [ ] "Safety Rails" section is expandable and shows all checks as pass/fail
- [ ] "Confirm" and "Override" buttons work from this page
- [ ] For non-autonomous requests: AI Reasoning card is not shown

### Monthly Report

- [ ] `/autopilot/report` loads with current month data
- [ ] Month selector switches between months
- [ ] Total decisions, spend, escalations, and override rate are accurate
- [ ] Charts render (spend by category, decisions by category, confidence distribution)
- [ ] Trust score reflects override rate (high overrides = declining trust)
- [ ] Recommendation text is contextual (suggests adjustments based on data)

### Edge Cases

- [ ] Landlord has no historical decisions — AI uses only profile and rules, confidence is lower
- [ ] Landlord has no automation rules (P2-003 not configured) — rule_alignment factor is 0, confidence drops
- [ ] Landlord has no preferred vendors — AI escalates if `preferred_vendors_only` is true
- [ ] Multiple requests arrive simultaneously — each evaluated independently, monthly cap checked atomically
- [ ] Landlord overrides a decision after the rollback window — request cannot be rolled back, but feedback is still recorded
- [ ] Landlord disables autopilot mid-month — pending decisions remain in feed, no new autonomous actions
- [ ] Landlord re-enables autopilot — resumes from current state, no replay of missed requests
- [ ] Emergency request with autopilot active — AI dispatches but always sends immediate notification
- [ ] AI cost estimate exceeds landlord's per-decision cap by $1 — escalates (strict boundary)
- [ ] Monthly cap has $50 remaining, new request estimates $100 — escalates (does not partially approve)

## Tasks

Tasks are outlined only. Detailed task files will be generated during implementation.

| # | Tier | Title | Depends On |
|---|------|-------|------------|
| 001 | Haiku | Database migration — `autonomy_settings` table | — |
| 002 | Haiku | Database migration — `autonomous_decisions` table | 001 |
| 003 | Haiku | Database migration — `autonomy_monthly_stats` table + `maintenance_requests` columns | 002 |
| 004 | Haiku | TypeScript types — `AutonomySettings`, `AutonomousDecision`, `MonthlyReportData`, etc. | — |
| 005 | Sonnet | Autonomy settings API — CRUD routes for `/api/autonomy/settings` | 001, 004 |
| 006 | Sonnet | Autonomous decisions API — GET (feed), POST (create), PATCH (review) for `/api/autonomy/decisions` | 002, 004 |
| 007 | Opus | Decision engine — confidence scoring + safety rails evaluation via Claude API | 005, 006 |
| 008 | Sonnet | Integration — wire decision engine into classification/dispatch pipeline | 007 |
| 009 | Sonnet | Monthly stats aggregation — API route + incremental stat updates | 003, 006 |
| 010 | Haiku | Install missing shadcn components — `toggle-group`, `chart` (if not installed) | — |
| 011 | Opus | Build Autonomy Dashboard UI — `/autopilot` with status banner, summary strip, decision feed | 006, 010 |
| 012 | Opus | Build Autonomy Settings UI — new "Autopilot" tab on `/settings` | 005, 010 |
| 013 | Opus | Build AI Reasoning Card — component for `/requests/[id]` right column | 006 |
| 014 | Opus | Build Monthly Report UI — `/autopilot/report` with charts and metrics | 009, 010 |
| 015 | Sonnet | Enable "Full autopilot" delegation mode — remove "Coming soon" disabled state | 012 |
| 016 | Sonnet | Sidebar navigation — add "Autopilot" link with pending-review badge | 011 |
| 017 | Sonnet | Override + rollback logic — dialog, feedback recording, cooldown enforcement | 006, 008 |
| 018 | Sonnet | Notification integration — notify on emergency auto-dispatch, respect preferences | 008 |
| 019 | Haiku | Unit tests — autonomy settings API routes | 005 |
| 020 | Haiku | Unit tests — autonomous decisions API routes | 006 |
| 021 | Sonnet | Integration tests — decision engine end-to-end flow | 007, 008 |
| 022 | Haiku | Unit tests — monthly stats aggregation | 009 |

**Tier breakdown**: 6 Haiku, 9 Sonnet, 5 Opus (22 tasks total)

**Dependency graph**:
- Foundation (parallel): 001, 004, 010
- Data layer: 001 -> 002 -> 003 (sequential migrations)
- API layer: 004 + 001 -> 005, 004 + 002 -> 006
- Engine: 005 + 006 -> 007 -> 008
- Stats: 003 + 006 -> 009
- UI (all depend on API + components): 011, 012, 013, 014
- Integration: 015, 016, 017, 018 (depend on UI + engine)
- Tests: parallel with implementation

**Critical path**: 001 -> 002 -> 006 -> 007 -> 008 -> 017

## Open Questions

1. **Claude API cost per autonomous evaluation** — Each decision requires a Claude Sonnet call with historical context (~2K-5K input tokens, ~500 output tokens). At scale (50+ requests/month/landlord), this could cost $1-3/landlord/month. Should we cache confidence scores for identical request patterns? Should there be a rate limit on evaluations?

2. **Confidence calibration** — The weighted scoring model (35% historical, 25% rules, etc.) is a starting point. Should we track actual landlord agreement rates per factor and dynamically adjust weights? This adds complexity but improves accuracy over time.

3. **Multi-property autonomy** — Should a landlord be able to enable autopilot for some properties but not others? The current design is all-or-nothing per landlord. Per-property autonomy adds a `property_id` column to `autonomy_settings` and complicates the UI.

4. **Vendor dispatch reality** — P3 assumes vendor dispatch actually sends notifications (SMS/email, from P2-002). If P2-002 is not complete, autonomous "dispatch" only updates the database. Should autonomous dispatch be gated on actual vendor notification capability?

5. **Rollback mechanics** — What does "rollback" mean concretely? If the AI dispatched to a vendor and the vendor was notified, can we "un-notify"? In practice, rollback may mean: cancel the work order, notify the vendor of cancellation, mark request as "pending review." The rollback window may need to account for vendor response time.

6. **Legal/liability considerations** — When the AI acts on behalf of a landlord, who is liable for the decision? The terms of service need to be clear that autopilot decisions are made on behalf of the landlord, not by Liz. Should there be an explicit liability acknowledgment during autopilot setup?

7. **Tenant visibility** — Should tenants see whether the AI or their landlord approved the maintenance dispatch? "AI Handled" badge could build trust (fast response) or erode it (nobody human reviewed my problem). Need user research.

8. **Cooldown mechanism specifics** — After an override, the AI pauses on "similar" requests. How do we define "similar"? Same category? Same category + cost range? Same property? Too broad a definition paralyzes the AI; too narrow and it repeats mistakes.

9. **Monthly stats accuracy** — Should `autonomy_monthly_stats` be computed on-the-fly from `autonomous_decisions` (always accurate, slower) or maintained incrementally (fast, but could drift)? A hybrid approach: incremental updates with a nightly reconciliation job.

10. **Phase 3 prerequisites** — This plan assumes P2-003 (rule-based automation) and P2-002 (vendor auto-scheduling) are complete. If they aren't, the confidence scoring loses the "rule_alignment" factor (25% weight) and dispatch is DB-only. Should P3-001 have a graceful degradation mode for incomplete Phase 2?
