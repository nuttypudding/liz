# Feature: Utility Company Integration

**ID**: P1-Tkt-001 (Work Stream 4)
**Ticket**: T-016
**Phase**: 1 — MVP
**Parent**: [P1-Tkt-001-mvp-ux-overhaul](./README.md)

## TL;DR

Auto-populate utility company information (electric, gas, water, trash, internet, HOA) for each property using Claude AI as a suggestion engine, with landlord confirmation and manual override. Store confirmed utility data in Supabase. Display on the property dashboard for landlords and as a read-only card for tenants.

## Summary

Landlords managing multiple properties need to track which utility companies serve each address. This information is used for:
- **Tenant communication** — sharing utility provider details with new tenants moving in
- **Vendor dispatch** — knowing which utility company to call for certain maintenance issues (e.g., gas leak goes to the gas company, not a plumber)
- **Property management** — keeping utility account numbers organized across a portfolio

Today, landlords track this in spreadsheets or not at all. This feature adds a **per-property utility info card** that auto-suggests providers based on the property address (using Claude AI), then lets the landlord confirm, edit, or override each entry. The confirmed data is stored in Supabase and displayed on the property dashboard drill-down (from P1-005).

The feature has four parts:
1. **AI suggestion engine** — Claude identifies likely utility providers from the address
2. **Utility setup flow** — modal for landlord to confirm or edit AI suggestions
3. **Utility info card** — read-only display on the property dashboard with edit capability
4. **Tenant utility view** — read-only card showing utility companies for a tenant's property

## User Stories

### Landlord
- As a landlord, I want utility company info auto-populated when I add a property address so I don't have to look it up manually.
- As a landlord, I want to see which suggestions came from AI vs. which I confirmed, so I know what still needs verification.
- As a landlord, I want to edit or override any utility company info (name, phone, website, account number) at any time.
- As a landlord, I want to mark a utility type as "N/A" (e.g., no gas service) so empty fields don't look like missing data.
- As a landlord, I want to store utility account numbers securely so I can reference them when calling the utility company.
- As a landlord, I want to view utility info for any property from its dashboard drill-down page.
- As a landlord, I want to trigger a re-lookup if I change a property's address, so utility suggestions stay accurate.

### Tenant
- As a tenant, I want to see my property's utility companies (name, phone, website) so I can set up service when I move in.
- As a tenant, I should NOT see account numbers — only the landlord sees those.

## Architecture (Auto-Pull Flow with Claude)

```
Property Created / Address Changed
       │
       ▼
POST /api/properties/[id]/utilities/suggest
       │
       ├── Read property address from DB
       ├── Send address to Claude API (Haiku — fast, cheap)
       │     Prompt: "Given this US property address, identify the likely
       │              utility providers: electric, gas, water/sewer,
       │              trash/recycling. Return JSON."
       ├── Parse Claude response → structured suggestions
       └── Return suggestions to client (NOT saved yet)
       │
       ▼
Landlord reviews suggestions in Setup Modal
       │
       ├── Confirms as-is → status = "confirmed"
       ├── Edits fields → status = "confirmed" (with landlord edits)
       ├── Marks N/A → status = "not_applicable"
       └── Leaves unreviewed → status = "ai_suggested"
       │
       ▼
PUT /api/properties/[id]/utilities
       │
       ├── Upsert rows in property_utilities table
       ├── Each utility type gets one row per property
       └── Store confirmation_status per row
       │
       ▼
GET /api/properties/[id]/utilities
       │
       ├── Returns all utility rows for the property
       └── Used by dashboard card + tenant view
```

### Route Group

```
apps/web/app/(landlord)/dashboard/properties/[id]/
└── (utility info is a card/section within the property drill-down page from P1-005)

apps/web/app/api/properties/[id]/utilities/
├── route.ts           — GET (list) + PUT (upsert all utility rows)
└── suggest/
    └── route.ts       — POST (Claude AI lookup by address)
```

### New API Routes

```
GET    /api/properties/[id]/utilities          — Fetch utility info for a property
PUT    /api/properties/[id]/utilities          — Upsert utility info (bulk — all types at once)
POST   /api/properties/[id]/utilities/suggest  — AI-suggest utility providers from address
```

## Tech Approach (Hybrid AI Suggestion + Manual Confirmation)

### Why Hybrid (Option 3)

External utility lookup APIs (UtilityAPI, EIA) have limited geographic coverage, require API keys with per-request costs, and often only cover electricity. Claude AI can suggest providers for any US address using its training data. The tradeoff is that Claude's suggestions may be outdated or imprecise for smaller municipalities. The hybrid approach mitigates this:

1. **Claude suggests** — fast, zero external dependencies, works for all utility types
2. **Landlord confirms** — catches AI errors, adds account numbers, marks N/A
3. **Confirmed data persists** — once confirmed, no further AI calls needed

### Claude AI Prompt Design

Use **Claude Haiku** (not Sonnet) for utility lookups — this is a structured data extraction task, not a nuanced classification. Haiku is faster and cheaper.

```
System: You are a utility company lookup assistant. Given a US property
address, identify the most likely utility service providers. Return ONLY
valid JSON matching the schema below. If you are unsure about a provider,
set confidence to "low". If a utility type likely does not apply (e.g.,
no gas service in an all-electric area), set provider_name to null.

Schema:
{
  "utilities": [
    {
      "utility_type": "electric" | "gas" | "water_sewer" | "trash_recycling",
      "provider_name": string | null,
      "provider_phone": string | null,
      "provider_website": string | null,
      "confidence": "high" | "medium" | "low"
    }
  ]
}

User: Property address: {address}
```

Internet/cable and HOA are NOT AI-suggested — they are landlord-entered only (too many options for internet, and HOA is property-specific knowledge the AI cannot reliably determine).

### Account Number Handling

Account numbers are sensitive data. Design decisions:
- Stored as plain text in Supabase (encrypted at rest by Supabase's default disk encryption)
- NOT sent to Claude — account numbers are landlord-entered, never included in AI prompts
- NOT shown in tenant views — tenant API endpoint omits `account_number` from response
- Masked in landlord UI — displayed as `****1234` with a "Show" toggle (client-side only)
- No additional application-level encryption for MVP — Supabase's at-rest encryption is sufficient for account numbers (not SSNs or payment cards)

### Re-Suggestion Trigger

When a landlord changes a property's address via PUT `/api/properties/[id]`:
- The properties API response includes a flag: `address_changed: true`
- The client shows a prompt: "Address changed. Would you like to re-lookup utility providers?"
- If yes, calls POST `/api/properties/[id]/utilities/suggest` with the new address
- Existing confirmed entries are preserved — AI suggestions only overwrite rows with `status = "ai_suggested"`

## UI Development Process (Detailed UX)

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design utility-info-card              # Phase 1: Plan the property utility card
/ux-design utility-setup-modal            # Phase 1: Plan the setup/edit flow
/ui-build utility-info-card               # Phase 2: Build card component
/ui-build utility-setup-modal             # Phase 2: Build modal/sheet
/ui-refine UtilityInfoCard                # Phase 3: Polish
/ui-refine UtilitySetupSheet              # Phase 3: Polish
```

### Design Principles

1. **Non-intrusive** — utility info is a card within the property drill-down, not a separate page. It should not dominate the view.
2. **Trust signals** — clear badges distinguishing "AI Suggested" (needs review) vs. "Confirmed" (landlord-verified) vs. "N/A".
3. **Progressive disclosure** — show company name + phone at a glance; expand for website + account number.
4. **Bulk confirm** — "Confirm All" button for landlords who trust the AI suggestions, rather than forcing per-row confirmation.
5. **Mobile-first** — utility types stack vertically on mobile. Each is a compact card row.

### shadcn Components Needed

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Utility info card container, individual utility rows |
| `badge` | Installed | "AI Suggested" / "Confirmed" / "N/A" status badges |
| `button` | Installed | Edit, Confirm All, Save, Cancel |
| `sheet` | Installed | Utility setup/edit slide-over panel |
| `input` | Installed | Company name, phone, website, account number fields |
| `label` | Installed | Form field labels |
| `switch` | Installed | N/A toggle per utility type |
| `skeleton` | Installed | Loading states for AI suggestion fetch |
| `tooltip` | Installed | Info icon explaining "AI Suggested" confidence |
| `separator` | Installed | Dividers between utility type sections |
| `dialog` | Installed | "Re-lookup utilities?" confirmation on address change |
| `tabs` | Installed | Optional — group utility types by category in edit view |
| `accordion` | **Needs install** | Expandable utility rows (name visible, details on expand) |

### Screen 1: Utility Info Card (Property Dashboard Drill-Down)

**Location**: Card within the P1-005 property drill-down page, below rent info and above work orders.

**Layout**: A `Card` with header "Utilities" and an "Edit" button. Inside, a list of utility types as compact rows.

```
UtilityInfoCard (components/properties/utility-info-card.tsx)
├── CardHeader
│   ├── CardTitle: "Utilities"
│   ├── Badge: count of confirmed vs. total (e.g., "4/6 confirmed")
│   └── Button (ghost, icon): Pencil → opens UtilitySetupSheet
├── CardContent
│   ├── UtilityRow (for each utility type with data)
│   │   ├── Icon (Zap for electric, Flame for gas, Droplets for water, Trash2 for trash, Wifi for internet, Building for HOA)
│   │   ├── Utility type label ("Electric")
│   │   ├── Provider name ("ComEd")
│   │   ├── Badge: "AI Suggested" (amber) | "Confirmed" (green) | "N/A" (gray)
│   │   └── Expandable detail (Accordion)
│   │       ├── Phone (clickable tel: link)
│   │       ├── Website (clickable external link)
│   │       └── Account #: ****1234 [Show] (landlord only)
│   └── EmptyState (if no utility data at all)
│       └── "No utility info yet. Click Edit to add or auto-detect."
└── (UtilitySetupSheet rendered here, controlled by state)
```

**Responsive strategy**:
- Desktop: 2-column grid of utility rows (3 rows of 2)
- Tablet: 2-column grid
- Mobile: single-column stack

**Badge colors**:
- `ai_suggested` — `variant="outline"` with amber/yellow text: "AI Suggested"
- `confirmed` — `variant="default"` (primary green): "Confirmed"
- `not_applicable` — `variant="secondary"` (gray): "N/A"

### Screen 2: Utility Setup Flow (AI Suggestion Review)

**Trigger**: Automatically shown when a property is first created (after save), or when landlord clicks "Auto-Detect Utilities" button, or on address change.

**Layout**: A `Sheet` (side panel) with the property address at top, followed by a list of utility types with pre-filled AI suggestions.

```
UtilitySetupSheet (components/properties/utility-setup-sheet.tsx)
├── SheetHeader
│   ├── SheetTitle: "Utility Providers"
│   ├── SheetDescription: "We found these providers for [address]. Confirm or edit."
│   └── Button: "Confirm All" (confirms all AI suggestions at once)
├── SheetContent (ScrollArea)
│   ├── UtilityTypeSection (repeated for each of 6 types)
│   │   ├── Section header: icon + "Electric" + confidence badge (if AI-suggested)
│   │   ├── Switch: "Not applicable" toggle (right-aligned)
│   │   │   └── When ON: collapses fields, sets status = not_applicable
│   │   ├── Input: Company name (pre-filled from AI or existing data)
│   │   ├── Input: Phone number
│   │   ├── Input: Website URL
│   │   ├── Input: Account number (optional, type=password with show toggle)
│   │   └── Separator
│   └── (AI suggestion loading state: Skeleton rows with pulsing animation)
├── SheetFooter
│   ├── Button: "Save" (primary) → PUT /api/properties/[id]/utilities
│   └── Button: "Cancel" (outline) → close sheet
```

**User flow**:
1. Sheet opens with skeleton loading state
2. POST `/api/properties/[id]/utilities/suggest` fires
3. AI suggestions populate the fields (electric, gas, water, trash)
4. Internet and HOA sections are blank (landlord-entered only)
5. Landlord reviews, edits fields, toggles N/A as needed
6. "Save" upserts all rows. Each row's status:
   - If AI-suggested and landlord didn't touch it: `ai_suggested`
   - If landlord edited any field: `confirmed`
   - If landlord clicked "Confirm All": all become `confirmed`
   - If N/A toggled: `not_applicable`

**Confidence indicator**: For AI-suggested rows, a small tooltip next to the company name:
- High confidence: green dot, "High confidence — common provider for this area"
- Medium confidence: amber dot, "Medium confidence — please verify"
- Low confidence: red dot, "Low confidence — we recommend checking with the local government"

### Screen 3: Utility Edit Form

**Same as Screen 2** (UtilitySetupSheet) but opened from the "Edit" button on the Utility Info Card. The only difference:
- No AI suggestion fetch (data is already stored)
- Fields are pre-filled from existing DB rows
- "Re-Detect" button available to re-run AI suggestions (overwrites only `ai_suggested` rows)

### Screen 4: Tenant Utility Info View

**Location**: Read-only card on the tenant's property view (future tenant dashboard, or shared link).

```
TenantUtilityCard (components/properties/tenant-utility-card.tsx)
├── CardHeader
│   └── CardTitle: "Utility Companies"
├── CardContent
│   ├── UtilityRow (for each confirmed/ai_suggested utility — excludes N/A)
│   │   ├── Icon + utility type label
│   │   ├── Provider name
│   │   ├── Phone (clickable tel: link)
│   │   └── Website (clickable external link)
│   │   (NO account number — omitted entirely)
│   └── Note: "Contact your landlord if any info is incorrect."
```

**Responsive strategy**: Single-column list. Compact rows with icon + name + phone on one line, website on second line. Mobile-optimized touch targets for tel: and http: links.

**Data source**: GET `/api/properties/[id]/utilities` — the API returns a filtered view for tenant role: omits `account_number` field, omits rows with `status = "not_applicable"`.

### Component Hierarchy (Full)

```
apps/web/
├── components/
│   └── properties/
│       ├── utility-info-card.tsx        — Landlord-facing utility display card
│       ├── utility-setup-sheet.tsx      — Sheet for reviewing/editing utility info
│       ├── utility-type-section.tsx     — One utility type's form fields (reused in sheet)
│       ├── utility-row.tsx              — One utility type's display row (reused in card)
│       └── tenant-utility-card.tsx      — Tenant-facing read-only utility card
├── app/
│   └── api/
│       └── properties/
│           └── [id]/
│               └── utilities/
│                   ├── route.ts         — GET + PUT
│                   └── suggest/
│                       └── route.ts     — POST (Claude AI lookup)
└── lib/
    └── validations.ts                   — Add utility schemas (extend existing file)
```

## Data Model (Utility Info Table)

### New Table: `property_utilities`

```sql
create table property_utilities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  utility_type text not null,
    -- 'electric' | 'gas' | 'water_sewer' | 'trash_recycling' | 'internet_cable' | 'hoa'
  provider_name text,
  provider_phone text,
  provider_website text,
  account_number text,          -- Landlord-entered, never sent to AI
  confirmation_status text not null default 'ai_suggested',
    -- 'ai_suggested' | 'confirmed' | 'not_applicable'
  ai_confidence text,
    -- 'high' | 'medium' | 'low' | null (null if landlord-entered)
  notes text,                   -- Optional landlord notes (e.g., "summer seasonal billing")

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- One row per utility type per property
  unique(property_id, utility_type)
);

-- Index for fast lookups by property
create index idx_property_utilities_property on property_utilities(property_id);

-- Reuse existing update_updated_at() trigger function
create trigger set_updated_at_property_utilities
  before update on property_utilities
  for each row execute function update_updated_at();
```

### Why One Table (Not a Column on Properties)

- **Extensibility** — adding new utility types (e.g., solar, propane) means adding rows, not columns
- **Per-type metadata** — each utility has its own confirmation status, confidence, and notes
- **Clean queries** — filtering by type or status is a WHERE clause, not column gymnastics
- **Sparse data** — properties without gas service simply have no gas row (or an N/A row), rather than null columns

### TypeScript Types

```typescript
export type UtilityType =
  | 'electric'
  | 'gas'
  | 'water_sewer'
  | 'trash_recycling'
  | 'internet_cable'
  | 'hoa';

export type ConfirmationStatus = 'ai_suggested' | 'confirmed' | 'not_applicable';

export type AiConfidence = 'high' | 'medium' | 'low';

export interface PropertyUtility {
  id: string;
  property_id: string;
  utility_type: UtilityType;
  provider_name: string | null;
  provider_phone: string | null;
  provider_website: string | null;
  account_number: string | null;  // Omitted in tenant responses
  confirmation_status: ConfirmationStatus;
  ai_confidence: AiConfidence | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// AI suggestion response (from Claude, before saving)
export interface UtilitySuggestion {
  utility_type: UtilityType;
  provider_name: string | null;
  provider_phone: string | null;
  provider_website: string | null;
  confidence: AiConfidence;
}

// PUT request body — bulk upsert
export interface UtilityUpsertPayload {
  utilities: Array<{
    utility_type: UtilityType;
    provider_name: string | null;
    provider_phone: string | null;
    provider_website: string | null;
    account_number: string | null;
    confirmation_status: ConfirmationStatus;
    notes: string | null;
  }>;
}
```

### HOA Special Fields

HOA entries use the same table but the semantics differ slightly:
- `provider_name` = HOA name (e.g., "Maple Ridge Homeowners Association")
- `provider_phone` = HOA contact phone
- `provider_website` = HOA portal URL
- `account_number` = HOA account or lot number
- `notes` = can include dues amount (e.g., "$250/month") — free text for MVP. A dedicated `hoa_dues` decimal column could be added later if structured HOA tracking is needed.

## Integration Points (with P1-005 Dashboard, Property Forms)

### 1. P1-005 Property-Centric Dashboard (Primary Integration)

The P1-005 property drill-down page is the main home for utility info. The `UtilityInfoCard` renders as a card/section within the property detail view:

```
Property Detail Page (P1-005)
├── Property header (name, address, unit count)
├── Rent info card
├── UtilityInfoCard  ← THIS FEATURE
├── Work orders card
├── Lease/docs card (P1-006)
└── Tenants list
```

**Dependency**: P1-007 utility card renders inside P1-005's page layout. If P1-005 is not yet built, the utility card can be temporarily placed on the existing properties page as an expandable section per property. The card component is self-contained and relocatable.

### 2. Property Creation Flow

When a landlord creates a new property (POST `/api/properties`), the success response triggers:
1. Toast: "Property added! Would you like to auto-detect utility providers?"
2. If yes: opens `UtilitySetupSheet` with the new property's address, fires AI suggestion
3. If dismissed: utility card shows empty state with "Auto-Detect" button

This is a client-side integration in the properties page — no backend coupling. The property creation API does not call the utility suggestion API.

### 3. Property Address Change

When a landlord updates a property address (PUT `/api/properties/[id]`):
1. Client detects address field changed (compare old vs. new)
2. Dialog: "Address changed. Re-detect utility providers? (Only updates unconfirmed entries.)"
3. If confirmed: POST suggest endpoint, merge results with existing data
4. Merge logic: AI suggestions only overwrite rows where `confirmation_status = 'ai_suggested'`. Confirmed and N/A rows are untouched.

### 4. Tenant View (Future)

The tenant dashboard (not yet built) will include the `TenantUtilityCard`. For MVP, this card can also be shown in a "tenant info" sheet when a landlord views a tenant, providing a preview of what the tenant will see.

### 5. Vendor Dispatch (Informational)

When dispatching a vendor for a utility-related issue (e.g., "gas smell" categorized as gas/emergency by P1-001 intake), the dispatch view could show the relevant utility company contact info as a reference. This is a read-only cross-reference — no API changes needed, just a UI enhancement on the dispatch page that queries the property's utility data.

### 6. Middleware / Auth

- Utility API routes use the same Clerk auth pattern as existing property routes
- GET endpoint checks: requester must be the property's landlord OR a tenant of the property
- PUT and POST (suggest) endpoints: landlord only
- Tenant GET responses omit `account_number` field

## Manual Testing Checklist

### AI Suggestion Flow
- [ ] Create a new property with a real US address (e.g., "123 Main St, Chicago, IL 60601")
- [ ] Click "Auto-Detect Utilities" or trigger from property creation
- [ ] Skeleton loading state appears while Claude processes
- [ ] AI suggestions populate: electric, gas, water, trash (4 rows)
- [ ] Each row shows provider name, confidence badge (high/medium/low)
- [ ] Internet and HOA sections are blank (not AI-suggested)
- [ ] Suggestions are NOT saved until landlord clicks Save

### Utility Setup Sheet
- [ ] Sheet opens from "Edit" button on utility card
- [ ] All 6 utility types are listed with form fields
- [ ] Pre-filled data appears for existing entries
- [ ] N/A toggle collapses the form fields for that utility type
- [ ] "Confirm All" button changes all `ai_suggested` rows to `confirmed`
- [ ] Save button upserts all rows to DB
- [ ] Cancel button discards unsaved changes
- [ ] Toast confirmation on successful save

### Utility Info Card
- [ ] Card displays on property dashboard/drill-down
- [ ] Each utility row shows: icon, type, provider name, status badge
- [ ] Accordion expands to show phone, website, masked account number
- [ ] "Show" button reveals full account number (client-side toggle)
- [ ] Phone numbers are clickable (tel: link)
- [ ] Website links open in new tab
- [ ] Badge colors: amber for AI Suggested, green for Confirmed, gray for N/A
- [ ] "4/6 confirmed" counter in card header is accurate
- [ ] Edit button opens the setup sheet pre-filled

### Tenant View
- [ ] Tenant utility card shows only confirmed and AI-suggested utilities
- [ ] N/A utilities are hidden
- [ ] Account numbers are NOT shown — field is completely absent
- [ ] Phone and website are clickable
- [ ] "Contact your landlord if any info is incorrect" note displays

### Address Change Re-Detection
- [ ] Edit property address → dialog asks "Re-detect utility providers?"
- [ ] Clicking "Yes" triggers new AI lookup
- [ ] AI suggestions only update rows with `ai_suggested` status
- [ ] Confirmed rows are preserved unchanged
- [ ] N/A rows are preserved unchanged

### Edge Cases
- [ ] Property with no address → "Auto-Detect" button disabled with tooltip "Add an address first"
- [ ] Claude API error/timeout → graceful error: "Could not auto-detect. Please enter manually."
- [ ] Non-US address → AI returns low-confidence or empty results; UI shows "Limited results for this address"
- [ ] All utilities marked N/A → card shows "No active utilities" instead of empty list
- [ ] Very long provider names → text truncates with ellipsis, full name in tooltip
- [ ] Property deleted → associated utility rows cascade-deleted (foreign key ON DELETE CASCADE)
- [ ] Concurrent edits → last-write-wins (upsert on unique constraint)

### Performance
- [ ] AI suggestion call completes in < 5 seconds
- [ ] Utility card loads instantly from cached DB data (no AI call on page load)
- [ ] Sheet opens and pre-fills within 200ms

## Tasks (Outline Only)

| # | Tier | Title | Depends On |
|---|------|-------|------------|
| 1 | Haiku | Database migration — property_utilities table with indexes and trigger | -- |
| 2 | Haiku | TypeScript types — UtilityType, PropertyUtility, UtilitySuggestion, UtilityUpsertPayload | -- |
| 3 | Haiku | Zod validation schemas — utility upsert payload, suggest response | -- |
| 4 | Sonnet | GET + PUT API routes — /api/properties/[id]/utilities (with tenant role filtering) | 1, 2, 3 |
| 5 | Sonnet | POST suggest API route — /api/properties/[id]/utilities/suggest (Claude Haiku integration) | 1, 2, 3 |
| 6 | Haiku | Install missing shadcn component — accordion | -- |
| 7 | Opus | Build UtilityInfoCard — display card with accordion rows, status badges, masked account numbers | 4, 6 |
| 8 | Opus | Build UtilitySetupSheet — edit/review sheet with AI suggestion loading, N/A toggles, Confirm All | 4, 5, 6 |
| 9 | Opus | Build TenantUtilityCard — read-only tenant-facing card (no account numbers) | 4, 6 |
| 10 | Sonnet | Property creation integration — post-create prompt to auto-detect utilities | 5, 8 |
| 11 | Sonnet | Address change integration — re-detect dialog with merge logic | 5, 8 |
| 12 | Haiku | Update endpoints.md — document new API routes and app integration points | 4, 5 |

**Tier breakdown**: 4 Haiku, 4 Sonnet, 3 Opus (front-end work is always Opus per project rules)

**Dependency graph**:
```
Tasks 1, 2, 3, 6 are independent foundations (can run in parallel)
       │
       ▼
Tasks 4, 5 depend on 1 + 2 + 3 (API routes need DB + types + validation)
       │
       ▼
Tasks 7, 8, 9 depend on 4 + 6 (UI needs API + accordion component)
Task 8 also depends on 5 (setup sheet needs suggest endpoint)
       │
       ▼
Tasks 10, 11 depend on 5 + 8 (integration flows need suggest API + sheet)
       │
       ▼
Task 12 depends on 4 + 5 (docs update after APIs are finalized)
```

## Open Questions

1. **Encryption for account numbers?** — MVP uses Supabase's default at-rest disk encryption. Application-level encryption (e.g., `pgcrypto`) would add complexity for limited benefit since account numbers are not as sensitive as payment card numbers or SSNs. Revisit if landlords request it or if compliance requirements change.

2. **Claude model for suggestions?** — Recommendation: Claude Haiku. This is structured data extraction from an address, not nuanced reasoning. Haiku is 10x cheaper than Sonnet and fast enough for real-time use. If suggestion quality is poor in testing, upgrade to Sonnet.

3. **Rate limiting on suggest endpoint?** — The AI suggestion endpoint should be rate-limited to prevent abuse (each call costs money). Recommendation: max 5 suggest calls per property per day, enforced server-side. A simple counter in the property_utilities metadata or a separate rate-limit table.

4. **Non-US addresses?** — Claude's training data is US-centric for utility providers. For non-US addresses, the AI may return poor results. MVP scope is US-only; the UI should show a note for non-US addresses: "Auto-detection works best for US addresses." International support can be added later with locale-specific prompts or external APIs.

5. **HOA dues as structured data?** — Currently, HOA dues amount is stored in the free-text `notes` field. If the product needs structured HOA tracking (dues amount, payment frequency, due date), a dedicated `hoa_details` JSONB column or separate table would be cleaner. Defer to post-MVP based on user feedback.

6. **Dependency on P1-005?** — The utility card is designed to live inside the P1-005 property drill-down page. If P1-005 is not yet implemented when this feature starts, the utility card can be placed as an expandable section on the existing `/dashboard/properties` page. The component is self-contained and can be relocated without code changes.
