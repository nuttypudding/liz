# Feature: Legal/Compliance Engine

**ID**: P3-003
**Ticket**: T-010
**Phase**: 3 — Full Vision

## TL;DR

Add jurisdiction-aware compliance rules, AI-powered communication review, automated legal notice generation, and a warning system that flags landlord actions that may violate local, state, or federal law — all with clear disclaimers that this is informational, not legal advice.

## Summary

Small landlords (1-20 units) are uniquely vulnerable to legal mistakes. They don't have in-house counsel, and landlord-tenant law varies wildly by jurisdiction. A California landlord needs 60 days notice for rent increases over 10%. A Texas landlord needs 3 days for eviction. A New York landlord faces rent stabilization rules that don't exist in most other states. Getting these wrong means lawsuits, fines, or voided actions.

This feature makes Liz a compliance-aware assistant that:

1. **Knows the rules** — A jurisdiction rules database covering state and city-level landlord-tenant law for every property in the landlord's portfolio.
2. **Reviews communications** — Before a landlord sends any message to a tenant, AI scans for potential fair housing violations, improper notice language, or missing required disclosures.
3. **Generates notices** — Legally-templated notice generation (entry notices, lease violations, rent increases, eviction notices) customized to the property's jurisdiction.
4. **Warns proactively** — When a landlord takes an action (e.g., raising rent, entering a unit, starting eviction), Liz checks jurisdiction rules and flags violations before the action is sent.
5. **Tracks compliance** — Per-property compliance score based on required disclosures, notice periods, and lease terms. Audit trail of all compliance checks.

This is the most legally sensitive feature in Liz. Every screen, every AI response, and every generated document must include a prominent disclaimer: **"This is not legal advice. Consult a licensed attorney for your specific situation."** The AI must actively recommend professional counsel for evictions, discrimination claims, and complex lease disputes.

The feature has six parts:
1. **Jurisdiction rules database** — Supabase tables seeded with state + city-level rules
2. **Property compliance dashboard** — Per-property score, checklist, required disclosures
3. **Notice generator** — AI-assisted, jurisdiction-aware legal notice creation
4. **Communication reviewer** — Pre-send compliance scanning of landlord messages
5. **Compliance alerts** — Proactive warnings when actions may violate law
6. **Legal knowledge base** — FAQ-style reference, per jurisdiction

## User Stories

### Landlord

- As a landlord, I want to see a compliance checklist for each property so I know what disclosures and notices are required in my jurisdiction.
- As a landlord, I want Liz to warn me before I take an action that violates local law (e.g., wrong eviction notice period, illegal late fee) so I avoid lawsuits.
- As a landlord, I want to generate legally-appropriate notices (entry, lease violation, rent increase, eviction) pre-filled with my property details and jurisdiction-correct language.
- As a landlord, I want Liz to review my tenant communications before I send them so I don't accidentally violate fair housing rules.
- As a landlord, I want to set my property's jurisdiction (state + city) so all compliance checks use the correct rules.
- As a landlord, I want a knowledge base of common landlord legal questions answered for my jurisdiction so I can self-educate.
- As a landlord, I want an audit trail of all compliance checks Liz has performed so I have documentation if disputes arise.
- As a landlord, I want Liz to tell me when to consult a lawyer instead of trying to handle everything with AI.

### Tenant (Indirect)

- As a tenant, I benefit from my landlord receiving proper legal notices and compliant communications, reducing disputes and protecting my rights.

## Architecture

```
Property Settings ──→ POST /api/properties/[id]/jurisdiction ──→ property_jurisdictions table
       │
       ▼
Compliance Dashboard ←── GET /api/compliance/[propertyId]/score
       │                     reads jurisdiction_rules + property_jurisdictions
       │                     returns: score, checklist, missing items
       ▼
Notice Generator ──→ POST /api/compliance/notices/generate
       │                 reads: jurisdiction_rules, property data, tenant data
       │                 AI generates notice text via Claude API
       │                 returns: notice preview (not sent)
       ▼
Notice Send ──→ POST /api/compliance/notices/[id]/send
       │            saves to compliance_audit_log
       ▼
Communication Reviewer ──→ POST /api/compliance/review
       │                        AI scans message text
       │                        returns: issues[], severity, suggestions
       ▼
Compliance Alerts ←── triggered by landlord actions
       │                 checked against jurisdiction_rules
       │                 displayed as warnings before action confirmation
       ▼
Knowledge Base ──→ GET /api/compliance/knowledge?jurisdiction=CA&topic=eviction
       │               reads jurisdiction_rules + AI-generated answers
       ▼
Audit Log ──→ GET /api/compliance/audit?propertyId=xxx
                  all compliance checks, notices, reviews logged
```

### New Route Group

```
apps/web/app/(landlord)/
├── compliance/
│   ├── page.tsx                         — Compliance dashboard (all properties)
│   ├── [propertyId]/page.tsx            — Per-property compliance detail
│   ├── notices/page.tsx                 — Notice generator
│   ├── notices/[id]/page.tsx            — Notice preview + send
│   ├── knowledge/page.tsx               — Legal knowledge base
│   └── settings/page.tsx                — Jurisdiction settings
```

### New API Routes

```
GET    /api/compliance/[propertyId]/score     — Compliance score + checklist for property
POST   /api/compliance/review                 — AI review of communication text
POST   /api/compliance/notices/generate       — Generate a legal notice
GET    /api/compliance/notices/[id]           — Get generated notice
POST   /api/compliance/notices/[id]/send      — Mark notice as sent, log to audit
GET    /api/compliance/knowledge              — Knowledge base articles by jurisdiction + topic
GET    /api/compliance/audit                  — Audit log of compliance actions
GET    /api/compliance/alerts/[propertyId]    — Active alerts for a property
POST   /api/properties/[id]/jurisdiction      — Set/update property jurisdiction
```

## Tech Approach

### Jurisdiction Rules Database

The core of this feature is a **rules database** — structured data about landlord-tenant law per jurisdiction. This is NOT a free-text legal database. It is a structured table of specific, actionable rules.

**Approach: Supabase-hosted rules table, seeded via migration.**

Seed data covers the 20 most common landlord states initially (CA, TX, FL, NY, IL, PA, OH, GA, NC, MI, NJ, VA, WA, AZ, MA, TN, IN, MO, MD, WI). City-level overrides for major cities with distinct local ordinances (NYC, LA, SF, Chicago, Seattle, Portland).

Each rule has:
- Jurisdiction (state code + optional city)
- Category (eviction, entry_notice, rent_increase, security_deposit, late_fees, disclosures, fair_housing)
- Rule text (the actual requirement)
- Structured fields (notice_days, max_amount, etc.)
- Source citation (statute reference)
- Last verified date

Rules are **not AI-generated at runtime**. They are curated, versioned, and updated via migrations. The AI reads rules from the database and applies them — it does not invent rules.

**Why not an external legal API?** Cost, latency, and control. For MVP-level compliance (notice periods, disclosure checklists, basic fair housing), a curated Supabase table is sufficient and keeps the system self-contained. An external API (e.g., LegalZoom API, Nolo API) could supplement in Phase 4 for complex case-specific questions.

### AI Communication Review

When a landlord composes a message to a tenant, the text is sent to Claude with:
1. The property's jurisdiction rules (from DB)
2. Fair housing guidelines (federal — always applied)
3. The message context (is this a notice? informal communication? response to complaint?)

Claude returns:
- `issues[]` — each with severity (warning/critical), description, and suggestion
- `compliant: boolean` — overall pass/fail
- `disclaimer` — always appended

The review is **advisory only**. The landlord can override and send anyway, but the override is logged in the audit trail.

### Notice Generator

The notice generator uses a two-step process:
1. **Template selection** — Based on notice type + jurisdiction, pull the correct template from the rules database (required language, notice periods, delivery methods).
2. **AI personalization** — Claude fills in the template with property details, tenant details, dates, and specific circumstances. Claude also flags if the situation may be too complex for templated notices (e.g., contested evictions).

Generated notices are saved to a `compliance_notices` table in draft status. The landlord reviews, optionally edits, then confirms send. The send action logs to the audit trail but does NOT actually deliver the notice — Liz generates the document; the landlord handles physical/electronic delivery.

### Compliance Score

Each property gets a compliance score (0-100) calculated from:
- Required disclosures provided (lead paint, mold, etc.) — weighted by jurisdiction
- Lease terms that match jurisdiction limits (late fees, security deposit caps)
- Recent notices generated through Liz (proper form used)
- Communication review pass rate (last 30 days)

Score is computed on-demand (not cached) from the audit log and property configuration. Simple weighted formula, not AI-dependent.

### Proactive Alerts

Alerts are triggered by landlord actions in the existing Liz workflow:
- **Rent increase action** — Check jurisdiction for notice period, percentage caps
- **Eviction initiation** — Check jurisdiction for required cure period, proper cause
- **Property entry** — Check jurisdiction for notice requirements (24h, 48h, etc.)
- **Late fee application** — Check jurisdiction for max percentage/amount
- **Security deposit deduction** — Check jurisdiction for itemization requirements, return deadlines

Alerts are rendered as warning banners on the relevant page (e.g., rent increase form shows a yellow banner: "California requires 30 days written notice for increases under 10%, 60 days for increases over 10%").

### Lawyer Referral Escalation

The AI must identify situations that exceed informational guidance and recommend professional counsel. Hard-coded escalation triggers:
- Any eviction for cause (discrimination, retaliation, non-payment disputes)
- Fair housing complaints or allegations
- ADA/accessibility accommodation requests
- Lease disputes involving amounts over $5,000
- Any situation where tenant has retained counsel
- Rent control/stabilization calculations in complex jurisdictions (NYC, SF, LA)

When an escalation trigger is detected, Liz shows a prominent "Consult an Attorney" recommendation with an explanation of why, and does NOT generate templated notices for these situations.

## UI Development Process

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design compliance-dashboard           # Phase 1: Plan property compliance overview
/ui-build compliance-dashboard            # Phase 2: Build from plan
/ui-refine ComplianceDashboard            # Phase 3: Polish

/ux-design notice-generator               # Phase 1: Plan notice creation flow
/ui-build notice-generator                # Phase 2: Build from plan
/ui-refine NoticeGenerator                # Phase 3: Polish

/ux-design communication-reviewer         # Phase 1: Plan pre-send review UI
/ui-build communication-reviewer          # Phase 2: Build from plan
/ui-refine CommunicationReviewer          # Phase 3: Polish

/ux-design compliance-settings            # Phase 1: Plan jurisdiction config
/ui-build compliance-settings             # Phase 2: Build from plan
/ui-refine ComplianceSettings             # Phase 3: Polish

/ux-design legal-knowledge-base           # Phase 1: Plan FAQ interface
/ui-build legal-knowledge-base            # Phase 2: Build from plan
/ui-refine LegalKnowledgeBase             # Phase 3: Polish
```

### Screen 1: Property Compliance Dashboard

**Route**: `/compliance` (all properties overview) and `/compliance/[propertyId]` (single property detail)

**Purpose**: At-a-glance compliance health for the entire portfolio, drill-down per property.

#### All Properties View (`/compliance`)

```
ComplianceDashboardPage
├── PageHeader ("Compliance Overview")
│   └── Subtitle: "Track legal requirements across your portfolio"
├── DisclaimerBanner (always visible, top of page)
│   └── AlertTriangle icon + "This is not legal advice..." text
├── PortfolioScoreCard
│   ├── Overall score (average across properties) — large number with color
│   ├── Properties at risk count (score < 70) — red badge
│   └── Actions needed count — yellow badge
├── PropertyComplianceGrid
│   └── For each property:
│       ├── PropertyComplianceCard
│       │   ├── Property name + address
│       │   ├── Jurisdiction badge (e.g., "CA — San Francisco")
│       │   ├── Score circle (green >= 80, yellow 60-79, red < 60)
│       │   ├── Missing items count
│       │   ├── Active alerts count
│       │   └── "View Details" link → /compliance/[propertyId]
│       └── (empty state if no properties)
└── QuickActions card
    ├── "Set Up Jurisdiction" — for properties without jurisdiction set
    ├── "Generate Notice" — link to /compliance/notices
    └── "Knowledge Base" — link to /compliance/knowledge
```

#### Single Property View (`/compliance/[propertyId]`)

```
PropertyCompliancePage
├── Breadcrumb: Compliance > {Property Name}
├── DisclaimerBanner
├── ComplianceScoreHeader
│   ├── Large score circle with color
│   ├── Jurisdiction label
│   └── "Last checked: {date}" timestamp
├── Tabs
│   ├── "Checklist" tab
│   │   ├── RequiredDisclosures section
│   │   │   ├── ChecklistItem (lead paint disclosure) — green check / red X
│   │   │   ├── ChecklistItem (mold disclosure)
│   │   │   ├── ChecklistItem (sex offender database notice)
│   │   │   └── ... (varies by jurisdiction)
│   │   ├── LeaseCompliance section
│   │   │   ├── ChecklistItem (security deposit within limit)
│   │   │   ├── ChecklistItem (late fee within limit)
│   │   │   └── ChecklistItem (lease includes required clauses)
│   │   └── NoticeCompliance section
│   │       ├── ChecklistItem (entry notice period correct)
│   │       └── ChecklistItem (rent increase notice period correct)
│   ├── "Alerts" tab
│   │   ├── AlertItem (severity + description + recommended action)
│   │   └── (empty state: "No active alerts — you're in good shape")
│   ├── "Notices" tab
│   │   ├── List of generated notices for this property
│   │   └── "Generate New Notice" button
│   └── "Audit Log" tab
│       ├── TimelineItem (compliance check performed)
│       ├── TimelineItem (notice generated)
│       └── TimelineItem (communication reviewed)
└── JurisdictionCard (sidebar or bottom)
    ├── State: {state}
    ├── City: {city or "None — state rules only"}
    └── "Edit Jurisdiction" link
```

**shadcn components**: `card`, `badge`, `tabs`, `progress`, `alert`, `separator`, `button`, `table`, `tooltip`

**Responsive**: Cards stack vertically on mobile. Grid is 1-column mobile, 2-column tablet, 3-column desktop. Tabs collapse to select dropdown on mobile.

#### User Flow

1. Landlord navigates to Compliance from sidebar
2. Sees all properties with color-coded compliance scores
3. Properties without jurisdiction set show "Set up required" prompt
4. Clicks property -> sees detailed checklist
5. Can mark disclosures as "provided" directly from checklist
6. Active alerts show what needs attention with clear next steps

### Screen 2: Notice Generator

**Route**: `/compliance/notices`

**Purpose**: Generate legally-appropriate notices customized to the property's jurisdiction.

```
NoticeGeneratorPage
├── PageHeader ("Generate Notice")
├── DisclaimerBanner
├── Step 1: SelectNoticeType
│   ├── NoticeTypeCard: "Entry Notice" (icon: DoorOpen)
│   │   └── Description: "Notify tenant of planned property entry"
│   ├── NoticeTypeCard: "Lease Violation" (icon: FileWarning)
│   │   └── Description: "Formal notice of lease term violation"
│   ├── NoticeTypeCard: "Rent Increase" (icon: TrendingUp)
│   │   └── Description: "Required notice of upcoming rent change"
│   ├── NoticeTypeCard: "Late Rent Notice" (icon: Clock)
│   │   └── Description: "Notice of overdue rent payment"
│   ├── NoticeTypeCard: "Eviction / Notice to Quit" (icon: AlertOctagon)
│   │   └── Description: "Formal notice to vacate" — shows lawyer warning
│   └── NoticeTypeCard: "Move-Out / Security Deposit" (icon: KeyRound)
│       └── Description: "Itemized deposit return or deduction notice"
│
├── Step 2: SelectPropertyAndTenant
│   ├── PropertySelect (dropdown — filters to properties with jurisdiction set)
│   ├── TenantSelect (dropdown — filters to tenants in selected property)
│   └── JurisdictionDisplay: "Rules for: {state} — {city}"
│
├── Step 3: NoticeDetails (varies by type)
│   ├── For Entry Notice:
│   │   ├── DatePicker: "Entry date"
│   │   ├── TimePicker: "Entry time"
│   │   ├── Input: "Reason for entry"
│   │   └── Info: "Required notice: {n} hours in {jurisdiction}"
│   ├── For Rent Increase:
│   │   ├── Input: "Current rent"
│   │   ├── Input: "New rent"
│   │   ├── DatePicker: "Effective date"
│   │   └── Warning (if applicable): "Rent increase over {n}% requires {n} days notice"
│   ├── For Eviction:
│   │   ├── LawyerEscalationBanner (prominent, cannot dismiss)
│   │   │   └── "Evictions are legally complex. We strongly recommend consulting an attorney."
│   │   ├── Select: "Reason for eviction"
│   │   └── Textarea: "Description of violation"
│   └── ... (other notice types)
│
├── Step 4: NoticePreview
│   ├── Generated notice text (rendered in a formal letter format)
│   ├── JurisdictionRulesApplied sidebar
│   │   ├── Rule: "Notice period: {n} days" — with statute citation
│   │   ├── Rule: "Delivery method: certified mail or personal service"
│   │   └── Rule: "Required language: {specific verbiage}"
│   ├── DisclaimerFooter (on the notice itself)
│   ├── "Edit Notice" button — opens editable textarea
│   ├── "Download PDF" button
│   ├── "Copy Text" button
│   └── "Confirm & Log" button — marks as sent in audit trail
│
└── (Eviction notices always show escalation banner at every step)
```

**shadcn components**: `card`, `button`, `select`, `input`, `textarea`, `badge`, `alert`, `separator`, `dialog`, `calendar` (needs install), `tooltip`

**Responsive**: Stepper is vertical on mobile, horizontal on desktop. Preview is full-width on all sizes.

#### User Flow

1. Landlord selects notice type (tappable cards, like onboarding)
2. Selects property + tenant (dropdowns auto-filtered)
3. Fills in notice-specific details; jurisdiction rules shown inline
4. AI generates the notice; landlord previews
5. Landlord can edit, download PDF, copy text, or confirm
6. Confirming logs to audit trail; landlord handles physical delivery

### Screen 3: Communication Reviewer

**Route**: Inline component, not a separate page. Appears wherever landlords compose messages to tenants.

**Purpose**: AI scans outgoing tenant communications for compliance issues before send.

```
CommunicationReviewer (inline component)
├── Trigger: "Review for Compliance" button (next to send button)
├── ReviewPanel (slides in or modal)
│   ├── ReviewHeader
│   │   ├── Status: "Reviewing..." → "Compliant" (green) / "Issues Found" (yellow/red)
│   │   └── DisclaimerSubtext
│   ├── IssuesList (if issues found)
│   │   ├── IssueItem
│   │   │   ├── Severity badge: "Warning" (yellow) or "Critical" (red)
│   │   │   ├── Issue description: "This language could be interpreted as discriminatory under Fair Housing Act"
│   │   │   ├── Highlighted text: the specific problematic phrase
│   │   │   └── Suggestion: "Consider rephrasing to: {alternative}"
│   │   └── ... (additional issues)
│   ├── CompliantMessage (if no issues)
│   │   └── "No compliance issues detected. Your message looks good."
│   ├── RulesApplied
│   │   ├── "Fair Housing Act (federal)"
│   │   ├── "{State} landlord-tenant statute"
│   │   └── "{City} local ordinance" (if applicable)
│   └── Actions
│       ├── "Send Anyway" button (if issues found — logs override to audit)
│       ├── "Edit Message" button
│       └── "Send" button (if compliant)
└── AuditNote: review result logged automatically
```

**shadcn components**: `sheet` (slide-in panel) or `dialog`, `badge`, `alert`, `button`, `separator`

**Responsive**: Sheet slides from right on desktop, slides from bottom on mobile (like a mobile drawer).

#### User Flow

1. Landlord composes message to tenant (from request detail page, property page, etc.)
2. Clicks "Review for Compliance" before sending
3. AI scans message in ~2-3 seconds (loading spinner)
4. If issues found: yellow/red warnings with specific text highlighted and suggestions
5. Landlord edits or sends anyway (override logged)
6. If no issues: green confirmation, landlord sends

### Screen 4: Compliance Settings

**Route**: `/compliance/settings` or integrated into existing property edit pages

**Purpose**: Configure jurisdiction per property, import lease terms.

```
ComplianceSettingsPage
├── PageHeader ("Compliance Settings")
├── DisclaimerBanner
├── PropertyJurisdictionList
│   └── For each property:
│       ├── PropertyJurisdictionCard
│       │   ├── Property name
│       │   ├── StateSelect (dropdown — all 50 states)
│       │   ├── CitySelect (dropdown — filtered by state, includes "None — state rules only")
│       │   ├── JurisdictionPreview
│       │   │   ├── "Key rules for {jurisdiction}:"
│       │   │   ├── Bullet: "Security deposit max: {n} months rent"
│       │   │   ├── Bullet: "Entry notice: {n} hours"
│       │   │   └── Bullet: "Eviction notice: {n} days (non-payment)"
│       │   └── "Save" button
│       └── (properties without jurisdiction are highlighted)
├── LeaseTermsSection
│   ├── Description: "Import your lease terms so Liz can check compliance"
│   ├── For each property:
│   │   ├── LeaseTermsCard
│   │   │   ├── Input: "Monthly rent" (pre-filled from properties table)
│   │   │   ├── Input: "Security deposit amount"
│   │   │   ├── Input: "Late fee amount"
│   │   │   ├── Input: "Late fee grace period (days)"
│   │   │   ├── Select: "Lease type" (month-to-month / fixed-term)
│   │   │   ├── DatePicker: "Lease start date"
│   │   │   ├── DatePicker: "Lease end date" (if fixed-term)
│   │   │   └── ComplianceCheck inline
│   │   │       ├── "Security deposit: within limit" (green) or "exceeds {state} max of {n}" (red)
│   │   │       └── "Late fee: within limit" (green) or "exceeds {state} max of {n}%" (red)
│   │   └── "Save" button
│   └── (future: upload lease PDF for AI extraction)
└── NotificationPreferences
    ├── Switch: "Alert me about compliance issues"
    ├── Switch: "Weekly compliance digest email"
    └── Switch: "Alert before jurisdiction rule changes take effect"
```

**shadcn components**: `card`, `select`, `input`, `button`, `switch`, `badge`, `calendar` (for date pickers), `separator`, `tooltip`

**Responsive**: Cards stack vertically on all screen sizes. Two-column on desktop for properties with multiple units.

#### User Flow

1. Landlord opens Compliance Settings
2. For each property, selects state and city
3. Jurisdiction preview shows key rules immediately (instant feedback)
4. Optionally imports lease terms — instant compliance check against jurisdiction limits
5. Saves; compliance score recalculates

### Screen 5: Legal Knowledge Base

**Route**: `/compliance/knowledge`

**Purpose**: FAQ-style reference answering common landlord legal questions, customized to the landlord's jurisdictions.

```
LegalKnowledgeBasePage
├── PageHeader ("Legal Knowledge Base")
│   └── Subtitle: "Common landlord questions, answered for your jurisdiction"
├── DisclaimerBanner (prominent)
├── JurisdictionFilter
│   ├── Select: "State" (defaults to landlord's most common state)
│   └── Select: "City" (optional)
├── TopicGrid
│   ├── TopicCard: "Eviction Process" (icon: Gavel)
│   │   └── Subtitle: "{n} steps in {state}"
│   ├── TopicCard: "Security Deposits" (icon: Landmark)
│   │   └── Subtitle: "Max {n} months, return within {n} days"
│   ├── TopicCard: "Rent Increases" (icon: TrendingUp)
│   │   └── Subtitle: "{n} days notice required"
│   ├── TopicCard: "Property Entry" (icon: DoorOpen)
│   │   └── Subtitle: "{n} hours notice required"
│   ├── TopicCard: "Fair Housing" (icon: Users)
│   │   └── Subtitle: "Federal + {state} protected classes"
│   ├── TopicCard: "Required Disclosures" (icon: FileText)
│   │   └── Subtitle: "{n} disclosures required in {state}"
│   ├── TopicCard: "Late Fees & Grace Periods" (icon: Clock)
│   │   └── Subtitle: "Max {amount or percentage} in {state}"
│   └── TopicCard: "Repairs & Habitability" (icon: Wrench)
│       └── Subtitle: "Landlord obligations in {state}"
├── TopicDetailView (when topic selected)
│   ├── TopicHeader + jurisdiction badge
│   ├── QuickAnswer (2-3 sentence summary)
│   ├── DetailedExplanation (expandable sections)
│   │   ├── "The Law" — statute reference and plain-language explanation
│   │   ├── "What You Must Do" — actionable checklist
│   │   ├── "Common Mistakes" — what to avoid
│   │   └── "When to Call a Lawyer" — escalation criteria
│   ├── RelatedNotices
│   │   └── "Generate a {notice type}" link (to notice generator)
│   └── SourceCitation
│       └── Statute number, link to official text (where available)
└── SearchBar (keyword search across all topics)
```

**shadcn components**: `card`, `badge`, `select`, `input`, `separator`, `accordion` (for expandable sections), `button`, `tooltip`

**Responsive**: Topic grid is 1-column mobile, 2-column tablet, 4-column desktop. Detail view is full-width with sidebar on desktop, stacked on mobile.

#### User Flow

1. Landlord selects their jurisdiction (defaults to their most common one)
2. Sees topic grid with jurisdiction-specific subtitles
3. Clicks a topic -> detailed explanation with statute references
4. Can generate related notices directly from knowledge base
5. Search bar for specific questions

### Screen 6: Compliance Alerts

**Route**: Inline banners on existing pages, plus `/compliance` alerts tab

**Purpose**: Proactive warnings when landlord actions may violate jurisdiction rules.

```
ComplianceAlertBanner (reusable component)
├── Icon: AlertTriangle (yellow) or ShieldAlert (red)
├── Alert title: "{Jurisdiction} Compliance Notice"
├── Alert body: e.g., "California requires 60 days written notice for rent increases over 10%. Your increase of 12% requires notice by {date}."
├── Rule citation: "Cal. Civ. Code 827(b)(3)"
├── Action: "Learn More" → link to knowledge base topic
├── Action: "Generate Notice" → link to notice generator
└── Dismiss (logged to audit trail — dismissed, not resolved)

Integration points:
├── Rent increase form → checks percentage + notice period
├── Eviction initiation → checks required cure period
├── Property entry scheduling → checks notice hours
├── Late fee application → checks amount caps
├── Security deposit deduction → checks itemization rules
└── Maintenance request resolution → checks habitability requirements
```

**shadcn components**: `alert`, `badge`, `button`, `tooltip`

**Responsive**: Full-width banner on all screen sizes. Stacks if multiple alerts active.

### shadcn Components Needed (All Screens)

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Containers throughout |
| `button` | Installed | Actions throughout |
| `badge` | Installed | Severity, status, jurisdiction labels |
| `tabs` | Installed | Property compliance detail, settings |
| `select` | Installed | Jurisdiction selection, notice type |
| `input` | Installed | Lease terms, search |
| `textarea` | Installed | Notice editing, message composition |
| `alert` | Installed | Compliance warnings, disclaimers |
| `separator` | Installed | Visual dividers |
| `progress` | Installed | Compliance score visualization |
| `table` | Installed | Audit log |
| `tooltip` | Installed | Rule explanations on hover |
| `switch` | Installed | Notification preferences |
| `dialog` | Installed | Confirmation modals |
| `sheet` | **Needs install** | Communication reviewer slide-in panel |
| `calendar` | **Needs install** | Date pickers for notices and lease terms |
| `accordion` | **Needs install** | Knowledge base expandable sections |

### Design Principles

1. **Disclaimers are not optional.** Every page, every generated notice, every AI response includes the legal disclaimer. It is a persistent banner, not a dismissable toast.
2. **Red means stop.** Critical compliance issues use red styling and block-level warnings. The landlord can proceed but must acknowledge the risk.
3. **Jurisdiction context is always visible.** Every compliance screen shows the active jurisdiction as a badge so the landlord always knows which rules apply.
4. **Escalation is prominent.** "Consult an attorney" recommendations are not buried in fine print. They get their own styled card with an explanation.
5. **Mobile-first.** Small landlords check things on their phones. All compliance screens must be fully usable on mobile.
6. **Audit trail is automatic.** Landlords don't need to manually log anything. Every compliance check, review, and notice is logged.

## Data Model

### New Table: `jurisdiction_rules`

The core rules database. Each row is one rule for one jurisdiction.

```sql
create table jurisdiction_rules (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,            -- e.g., 'CA', 'TX', 'NY'
  city text,                           -- e.g., 'San Francisco', null for state-level
  category text not null,              -- eviction | entry_notice | rent_increase |
                                       -- security_deposit | late_fees | disclosures |
                                       -- fair_housing | habitability | lease_terms
  subcategory text,                    -- e.g., 'non_payment', 'no_cause', 'lease_violation'
  rule_key text not null,              -- machine-readable key, e.g., 'eviction_notice_days'
  rule_text text not null,             -- human-readable rule description
  rule_value text,                     -- structured value, e.g., '30' (days), '2' (months)
  rule_value_type text,                -- 'days' | 'months' | 'currency' | 'percentage' | 'boolean' | 'text'
  statute_citation text,               -- e.g., 'Cal. Civ. Code 1946.2'
  statute_url text,                    -- link to official statute text
  notes text,                          -- additional context, exceptions
  effective_date date,                 -- when the rule took effect
  last_verified_at timestamptz,        -- when we last confirmed accuracy
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast jurisdiction + category lookups
create index idx_jurisdiction_rules_lookup
  on jurisdiction_rules(state_code, city, category);

-- Unique constraint: one rule_key per jurisdiction
create unique index idx_jurisdiction_rules_unique
  on jurisdiction_rules(state_code, coalesce(city, ''), rule_key);
```

### New Table: `property_jurisdictions`

Links each property to its jurisdiction. Separate from the `properties` table to keep concerns clean.

```sql
create table property_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null unique,
  state_code text not null,
  city text,                           -- null if no city-specific rules
  lease_type text default 'month_to_month',  -- 'month_to_month' | 'fixed_term'
  lease_start_date date,
  lease_end_date date,
  security_deposit_amount decimal(10,2),
  late_fee_amount decimal(10,2),
  late_fee_grace_days int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### New Table: `compliance_notices`

Generated notices, with draft/sent lifecycle.

```sql
create table compliance_notices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  tenant_id uuid references tenants,
  landlord_id text not null,           -- Clerk user ID
  notice_type text not null,           -- entry | lease_violation | rent_increase |
                                       -- late_rent | eviction | security_deposit
  status text not null default 'draft', -- draft | sent | cancelled
  generated_text text not null,        -- the AI-generated notice content
  edited_text text,                    -- landlord's edited version (null if unchanged)
  jurisdiction_rules_applied jsonb,    -- snapshot of rules used for generation
  ai_warnings text[],                  -- any AI-flagged concerns about this notice
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### New Table: `compliance_audit_log`

Immutable log of all compliance actions. Never updated or deleted.

```sql
create table compliance_audit_log (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,           -- Clerk user ID
  property_id uuid references properties,
  action_type text not null,           -- compliance_check | notice_generated |
                                       -- notice_sent | communication_reviewed |
                                       -- alert_triggered | alert_dismissed |
                                       -- review_override | escalation_shown
  action_detail jsonb not null,        -- structured detail per action type
  compliance_result text,              -- compliant | warning | critical | escalated
  jurisdiction_snapshot jsonb,         -- rules that applied at time of action
  created_at timestamptz default now()
  -- No updated_at — this table is append-only
);

create index idx_compliance_audit_landlord
  on compliance_audit_log(landlord_id, created_at desc);

create index idx_compliance_audit_property
  on compliance_audit_log(property_id, created_at desc);
```

### New Table: `compliance_checklist_items`

Tracks which disclosure/compliance items a landlord has completed per property.

```sql
create table compliance_checklist_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  rule_id uuid references jurisdiction_rules not null,
  completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(property_id, rule_id)
);
```

### TypeScript Types

```typescript
export interface JurisdictionRule {
  id: string;
  state_code: string;
  city: string | null;
  category: 'eviction' | 'entry_notice' | 'rent_increase' | 'security_deposit'
    | 'late_fees' | 'disclosures' | 'fair_housing' | 'habitability' | 'lease_terms';
  subcategory: string | null;
  rule_key: string;
  rule_text: string;
  rule_value: string | null;
  rule_value_type: 'days' | 'months' | 'currency' | 'percentage' | 'boolean' | 'text' | null;
  statute_citation: string | null;
  statute_url: string | null;
  notes: string | null;
  effective_date: string | null;
  last_verified_at: string | null;
}

export interface PropertyJurisdiction {
  id: string;
  property_id: string;
  state_code: string;
  city: string | null;
  lease_type: 'month_to_month' | 'fixed_term';
  lease_start_date: string | null;
  lease_end_date: string | null;
  security_deposit_amount: number | null;
  late_fee_amount: number | null;
  late_fee_grace_days: number | null;
}

export interface ComplianceNotice {
  id: string;
  property_id: string;
  tenant_id: string | null;
  landlord_id: string;
  notice_type: 'entry' | 'lease_violation' | 'rent_increase' | 'late_rent'
    | 'eviction' | 'security_deposit';
  status: 'draft' | 'sent' | 'cancelled';
  generated_text: string;
  edited_text: string | null;
  jurisdiction_rules_applied: Record<string, unknown>;
  ai_warnings: string[];
  sent_at: string | null;
  created_at: string;
}

export interface ComplianceAuditEntry {
  id: string;
  landlord_id: string;
  property_id: string | null;
  action_type: 'compliance_check' | 'notice_generated' | 'notice_sent'
    | 'communication_reviewed' | 'alert_triggered' | 'alert_dismissed'
    | 'review_override' | 'escalation_shown';
  action_detail: Record<string, unknown>;
  compliance_result: 'compliant' | 'warning' | 'critical' | 'escalated' | null;
  jurisdiction_snapshot: Record<string, unknown> | null;
  created_at: string;
}

export interface ComplianceScore {
  property_id: string;
  score: number;                       // 0-100
  total_items: number;
  completed_items: number;
  missing_disclosures: string[];
  lease_issues: string[];
  active_alerts: ComplianceAlert[];
}

export interface ComplianceAlert {
  id: string;
  property_id: string;
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  rule_citation: string | null;
  action_url: string | null;           // link to relevant page
  action_label: string | null;         // e.g., "Generate Notice"
}

export interface CommunicationReviewResult {
  compliant: boolean;
  issues: CommunicationIssue[];
  rules_applied: string[];
  disclaimer: string;
}

export interface CommunicationIssue {
  severity: 'warning' | 'critical';
  description: string;
  highlighted_text: string;            // the specific problematic phrase
  suggestion: string;
}
```

## Integration Points

### 1. AI Classification (`/api/classify`)

Existing route. After classification, check if the maintenance request has compliance implications:
- **Habitability issues** (mold, no heat, structural damage) — flag that the landlord has a legal duty to repair within jurisdiction-specific timeframes.
- **Add compliance context** to the AI response: "Note: {state} law requires landlords to address habitability issues within {n} days."

### 2. Maintenance Request Detail (`/requests/[id]`)

Existing page. Add compliance banner when:
- The request involves a habitability issue → "This may be a habitability obligation under {state} law."
- The landlord is scheduling entry to inspect → "Remember: {state} requires {n} hours notice before entry."

### 3. Vendor Dispatch (`/api/requests/[id]/dispatch`)

Existing route. When dispatching for habitability-related issues, log a compliance audit entry noting the landlord addressed the issue within the required timeframe (or flag if overdue).

### 4. Landlord Dashboard (`/dashboard`)

Add a compliance summary card:
- Properties at risk (score < 70): count with red badge
- Pending actions: count of incomplete checklist items
- "View Compliance" link

### 5. Property Pages (`/properties`)

Add jurisdiction badge to each property card. Add "Compliance" tab to property detail view.

### 6. Tenant Communication (Future)

When Liz adds direct landlord-tenant messaging (Phase 2/3), the communication reviewer integrates directly into the message compose flow. For now, it works as a standalone review tool where the landlord pastes their draft message.

### 7. Decision Profile (`/api/settings/profile`)

Read the landlord's decision profile to adjust compliance tone:
- `manual` delegation mode → show all compliance details and require explicit acknowledgment
- `assist` mode → show summaries with expand-for-detail option
- `auto` mode → compliance checks run automatically, only surface critical issues

## Legal Disclaimers

This section defines the disclaimer strategy. It is not optional. Every implementation task must reference this section.

### Primary Disclaimer (appears on every compliance page)

> **Important: This is not legal advice.** Liz provides general information about landlord-tenant law to help you stay informed. This information may not reflect the most recent legal developments and does not account for your specific circumstances. Always consult a licensed attorney in your jurisdiction before taking legal action, especially regarding evictions, discrimination claims, or lease disputes.

### Notice Generator Disclaimer (appears on every generated notice)

> **This notice was generated by AI for informational purposes only.** It is based on general legal requirements for {jurisdiction} as of {date}. Laws change frequently and may have exceptions that apply to your situation. Have this notice reviewed by a licensed attorney before serving it to your tenant. Liz and its creators are not responsible for legal outcomes resulting from the use of generated notices.

### Communication Review Disclaimer (appears on every review result)

> **AI compliance review is not a substitute for legal counsel.** This review checks for common compliance issues but cannot guarantee legal compliance. Some issues may not be detectable through text analysis alone. When in doubt, consult an attorney.

### Escalation Disclaimer (appears when lawyer referral is triggered)

> **This situation may require professional legal guidance.** Liz has identified factors that suggest this matter is too complex for general informational tools. We strongly recommend consulting a licensed attorney who specializes in landlord-tenant law in your jurisdiction before proceeding. Taking action without professional guidance in situations like this may expose you to legal liability.

### Implementation Rules

1. **Disclaimers use the `DisclaimerBanner` component** — a persistent, non-dismissable `alert` variant with `AlertTriangle` icon.
2. **Disclaimers appear at the top of every compliance page**, above all content.
3. **Generated notices include the disclaimer as part of the document footer**, not just on the UI.
4. **API responses include a `disclaimer` field** in the response body for all compliance endpoints.
5. **The AI prompt for all compliance features includes instructions** to recommend professional counsel for complex situations.
6. **Escalation triggers are hard-coded** (see Tech Approach section), not AI-determined.
7. **The disclaimer text is defined in a single shared constant** (`lib/compliance/disclaimers.ts`) to ensure consistency.

## Manual Testing Checklist

### Jurisdiction Setup

- [ ] Open Compliance Settings for a property
- [ ] Select state (e.g., California) — key rules preview appears immediately
- [ ] Select city (e.g., San Francisco) — additional city-level rules appear
- [ ] Save jurisdiction — compliance score calculates for the property
- [ ] Property card on /compliance now shows jurisdiction badge and score
- [ ] Property without jurisdiction shows "Set up required" prompt

### Compliance Dashboard

- [ ] `/compliance` shows all properties with color-coded scores
- [ ] Green score (>= 80) renders green, yellow (60-79) renders yellow, red (< 60) renders red
- [ ] Click property -> detail view loads with correct jurisdiction
- [ ] Checklist tab shows jurisdiction-appropriate items
- [ ] Can mark checklist items as completed -> score updates
- [ ] Alerts tab shows active alerts (or empty state)
- [ ] Audit log tab shows compliance history
- [ ] Disclaimer banner visible and non-dismissable

### Notice Generator

- [ ] Select "Entry Notice" -> property + tenant selection appears
- [ ] Jurisdiction rules display for selected property (e.g., "24 hours notice required in CA")
- [ ] Fill in details -> "Generate Notice" produces AI-generated text
- [ ] Generated text includes jurisdiction-specific language
- [ ] Can edit generated text -> edited version saved separately
- [ ] "Download PDF" produces a properly formatted document
- [ ] "Confirm & Log" saves to audit trail
- [ ] Select "Eviction" -> lawyer escalation banner appears at every step
- [ ] Cannot proceed with eviction notice without acknowledging escalation
- [ ] Disclaimer appears on the generated notice document itself

### Communication Reviewer

- [ ] Compose a neutral message -> review returns "Compliant" (green)
- [ ] Compose message with potentially discriminatory language (e.g., "families with children are noisy") -> review flags fair housing issue
- [ ] Flagged issue shows: severity, problematic text highlighted, suggestion
- [ ] "Send Anyway" is available but logs override to audit trail
- [ ] "Edit Message" returns to compose view
- [ ] Review works for messages of various lengths (short, long)
- [ ] Disclaimer appears on review result

### Compliance Alerts

- [ ] Create a rent increase action for a CA property over 10% -> alert banner appears: "60 days notice required"
- [ ] Schedule property entry without adequate notice -> alert appears
- [ ] Alert shows statute citation
- [ ] "Learn More" links to correct knowledge base topic
- [ ] "Generate Notice" links to notice generator with correct type pre-selected
- [ ] Dismissing an alert logs to audit trail

### Knowledge Base

- [ ] `/compliance/knowledge` loads with landlord's default jurisdiction
- [ ] Topic cards show jurisdiction-specific subtitles (e.g., "30 days notice" for CA entry)
- [ ] Click topic -> detailed view with law explanation, checklist, common mistakes
- [ ] "Generate a Notice" link navigates to notice generator
- [ ] Statute citations are present and formatted
- [ ] Search bar filters topics
- [ ] Switching jurisdiction updates all topic subtitles
- [ ] Disclaimer banner visible

### Audit Trail

- [ ] Compliance check -> logged
- [ ] Notice generated -> logged
- [ ] Notice sent -> logged
- [ ] Communication reviewed -> logged
- [ ] Alert triggered -> logged
- [ ] Alert dismissed -> logged
- [ ] Review override ("Send Anyway") -> logged with original message
- [ ] Escalation shown -> logged
- [ ] Audit entries show correct timestamps and detail

### Edge Cases

- [ ] Property with no jurisdiction set -> compliance pages show setup prompt, not errors
- [ ] Jurisdiction with no city-level rules -> gracefully uses state-only rules
- [ ] Generating notice for a jurisdiction not yet in the database -> shows "Rules not available for this jurisdiction" with "Consult an attorney" recommendation
- [ ] Very long tenant message in communication review -> handles without timeout
- [ ] Multiple alerts on same page -> stack properly without overflow
- [ ] Landlord with properties in different states -> each property shows correct jurisdiction rules
- [ ] Mobile: all pages usable on small screen; stepper is vertical; panels slide from bottom

### Legal Safeguards

- [ ] Every compliance page shows the disclaimer banner
- [ ] Every generated notice includes disclaimer in the document
- [ ] Every API response includes `disclaimer` field
- [ ] Eviction flow always shows lawyer escalation
- [ ] Fair housing complaint detection always recommends attorney
- [ ] ADA accommodation request always recommends attorney
- [ ] Disclaimer text is consistent across all pages (sourced from single constant)
- [ ] Cannot generate eviction notices without escalation acknowledgment

## Tasks

Tasks will be numbered and tiered when this feature moves to `inprogress/`. Preliminary task outline:

| # | Tier | Title | Depends On |
|---|------|-------|------------|
| 1 | Haiku | Database migration — jurisdiction_rules, property_jurisdictions, compliance_notices, compliance_audit_log, compliance_checklist_items tables | -- |
| 2 | Haiku | Seed jurisdiction rules — 20 states + 5 major cities initial dataset | 1 |
| 3 | Haiku | Install missing shadcn components — sheet, calendar, accordion | -- |
| 4 | Sonnet | Compliance disclaimers module — shared constants, DisclaimerBanner component | 3 |
| 5 | Sonnet | Jurisdiction API routes — GET/POST /api/properties/[id]/jurisdiction | 1 |
| 6 | Sonnet | Compliance score API route — GET /api/compliance/[propertyId]/score | 1, 2 |
| 7 | Sonnet | Compliance checklist API — mark items complete, fetch status | 1, 2 |
| 8 | Sonnet | Communication review API route — POST /api/compliance/review (Claude integration) | 1, 4 |
| 9 | Sonnet | Notice generation API route — POST /api/compliance/notices/generate (Claude integration) | 1, 2, 4 |
| 10 | Sonnet | Notice send + audit log API route — POST /api/compliance/notices/[id]/send + GET audit | 1, 9 |
| 11 | Sonnet | Knowledge base API route — GET /api/compliance/knowledge | 1, 2 |
| 12 | Sonnet | Compliance alerts API route — GET /api/compliance/alerts/[propertyId] | 1, 2, 5 |
| 13 | Opus | Build compliance dashboard UI — all-properties view + single-property detail | 4, 5, 6, 7 |
| 14 | Opus | Build notice generator UI — multi-step notice creation + preview | 4, 5, 9, 10 |
| 15 | Opus | Build communication reviewer UI — inline review component | 4, 8 |
| 16 | Opus | Build compliance settings UI — jurisdiction config + lease terms | 4, 5 |
| 17 | Opus | Build legal knowledge base UI — topic grid + detail views | 4, 11 |
| 18 | Opus | Build compliance alert banners — integrate into existing pages | 4, 12 |
| 19 | Sonnet | Integrate compliance into dashboard — summary card + property badges | 6, 13 |
| 20 | Sonnet | Integrate compliance into maintenance flow — habitability alerts + entry notices | 12, 18 |
| 21 | Sonnet | AI prompt engineering — compliance review + notice generation prompts | 8, 9 |
| 22 | Haiku | Unit tests — jurisdiction rules lookup, compliance score calculation | 5, 6 |
| 23 | Haiku | Unit tests — notice generation, communication review API | 8, 9 |
| 24 | Haiku | Seed data validation — verify all 20 states + 5 cities have complete rule coverage | 2 |

**Tier breakdown**: 4 Haiku, 10 Sonnet, 6 Opus
**Dependency graph**: Tasks 1-3 are independent foundations. Task 4 (disclaimers) unblocks all UI tasks. Tasks 5-12 (API routes) can largely proceed in parallel after migrations. Tasks 13-18 (UI builds) depend on their respective API routes. Tasks 19-21 (integrations) come last. Tasks 22-24 (tests/validation) can run in parallel with UI work.

**Estimated scope**: This is a large feature. Consider splitting into sub-phases:
- **3a**: Jurisdiction setup + compliance dashboard + checklist (tasks 1-7, 13, 16, 22)
- **3b**: Notice generator + communication reviewer (tasks 8-10, 14, 15, 21, 23)
- **3c**: Knowledge base + alerts + integrations (tasks 11, 12, 17, 18, 19, 20, 24)

## Open Questions

1. **Jurisdiction data sourcing**: The initial seed covers 20 states + 5 cities. How do we scale to all 50 states and hundreds of cities with local ordinances? Options: (a) community-contributed data with review process, (b) partner with a legal data provider, (c) AI-assisted extraction from statute text with human verification. Recommendation: Start with (a) for the 20 most common states, build the tooling for (c), and evaluate (b) for v2.

2. **Rule freshness / update cadence**: Landlord-tenant law changes every legislative session. How often do we verify rules? Recommendation: Quarterly review cycle with `last_verified_at` tracking. Display a warning if a rule hasn't been verified in 6+ months: "This information was last verified on {date}. Laws may have changed."

3. **Liability and terms of service**: This feature increases legal risk for Liz. The product terms of service must explicitly disclaim legal advice and limit liability. Recommendation: Have a real attorney review the ToS before shipping this feature.

4. **PDF generation for notices**: The notice generator creates text. Should we also generate formatted PDF documents? Recommendation: Yes, but defer to a later iteration. For initial release, provide copyable text and a "Print" option that uses the browser's built-in print-to-PDF.

5. **External legal API integration**: Should we supplement the curated rules database with a real-time legal API? Recommendation: Not for initial release. The curated database is more predictable and cheaper. Evaluate after launch whether users need more granular or up-to-date data than we can curate manually.

6. **Rent control / stabilization**: Cities like NYC, SF, LA, and Portland have extremely complex rent control rules (base rent calculations, allowable increase percentages, exemptions by building age). Should we attempt to model these? Recommendation: No. Display a prominent warning: "This property may be subject to rent control/stabilization. Consult an attorney for rent increase calculations." Rent control rules are too complex and change too frequently for a curated database.

7. **Multi-state landlords**: A landlord with properties in CA and TX sees different rules per property. The UI handles this (jurisdiction is per-property), but should the knowledge base default to "all my jurisdictions" or require picking one? Recommendation: Default to the jurisdiction with the most properties. Allow switching.

8. **Audit log retention**: How long do we keep compliance audit logs? Recommendation: Indefinitely (append-only table). These logs could be critical evidence in legal disputes. Storage cost is minimal for text records.

9. **Notice delivery tracking**: The initial version generates notices but does not handle delivery. Should we add delivery method tracking (certified mail tracking number, personal service confirmation)? Recommendation: Add a simple "delivery method" and "delivery date" field to `compliance_notices` in v2. Not needed for initial release.

10. **Internationalization**: Landlord-tenant law is US-specific in this plan. Should the data model support international jurisdictions? Recommendation: Not now. The `state_code` + `city` model is US-centric by design. If we expand internationally, we'd need a `country` + `region` + `locality` hierarchy, which is a different data model. Defer.
