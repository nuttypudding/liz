# Feature: Onboarding UX Refinements

**ID**: P1-Tkt-001 (Work Stream 1)
**Ticket**: T-016
**Phase**: 1 — MVP
**Parent**: [P1-Tkt-001-mvp-ux-overhaul](./README.md)

## TL;DR

Product owner review of the deployed onboarding wizard surfaced 15 changes across all 4 data-entry steps: rename "AI" to "Agent" terminology, fix the broken auto-approve slider (T-011), add missing fields to the property/tenant/vendor forms, format phone numbers with dashes, remove the unit number from the tenant form (it belongs on the property), and add custom-field and vendor-ranking capabilities. These changes touch shared form components, so both the onboarding wizard and the standalone landlord pages (/properties, /vendors) are affected.

## Summary

All 15 changes grouped by wizard step, with current vs. proposed state:

### Step 1 --- AI Preferences

| # | Change | Current State | Proposed State |
|---|--------|--------------|----------------|
| 1 | Rename "AI" to "Agent" in risk appetite header | `"Welcome to Liz! How should your AI prioritize?"` | `"Welcome to Liz! How should your Agent prioritize?"` |
| 2 | Rename "Liz" to "your agent" in delegation header | `"How much should Liz handle on her own?"` | `"How much should your agent handle on its own?"` |
| 3 | Fix broken auto-approve slider (BUG T-011) | Slider renders but does not respond to drag/click interaction | Slider functions correctly: drag thumb, click track, value updates live |
| 4 | Full autopilot requires max amount | "Full autopilot" card is disabled with "Coming soon" badge; no spending cap concept | Add a secondary note under the disabled card: "When enabled, requires a maximum spending amount." Also pre-design the `max_autopilot_spend` input (hidden until autopilot unlocked in Phase 2) |
| 5 | Allow all delegation + risk combos; add implication note | No validation or guidance on combos | Allow all combos. When "I approve everything" + "Move Fast" is selected, show a subtle info note: "You've chosen to approve everything manually while prioritizing speed. Your agent will recommend fast vendors but wait for your approval before dispatching." Similar notes for other noteworthy combos |

### Step 2 --- Property

| # | Change | Current State | Proposed State |
|---|--------|--------------|----------------|
| 6 | Add "Apt or Unit No." field | Property form has: name, address, unit_count, monthly_rent | Add optional `apt_or_unit_no` text field between address and unit_count. Label: "Apt or Unit No." Placeholder: "e.g. Suite 200, Unit B" |

### Step 3 --- Tenants

| # | Change | Current State | Proposed State |
|---|--------|--------------|----------------|
| 7 | Property name as prominent header | `CardTitle`: "Add tenants" with `CardDescription`: "Add tenants for {property.name}..." | `CardTitle`: "Add tenants for {property.name}" as the primary heading. Remove redundant description text referencing the property |
| 8 | Add move-in date field | Not present | Date picker: "Move-in date" (optional). Uses `<Input type="date" />` or shadcn Popover+Calendar |
| 9 | Add lease type field | Not present | Select dropdown: "Lease type" with options "Yearly" and "Month to Month" (optional) |
| 10 | Add lease due date field | Not present | Date picker or day-of-month selector: "Rent due date" (optional). For MVP, a simple number input (1--31) labeled "Rent due day" is sufficient |
| 11 | Format phone number with dashes | Raw text input, no formatting. User types `7142433345` | Auto-format as `714-243-3345` while typing. Strip non-digits on save. Show formatted value in display |
| 12 | Remove unit number field | Tenant form has `unit_number` field (both in wizard and standalone TenantForm) | Remove `unit_number` from tenant form entirely. Unit identity comes from the property's `apt_or_unit_no` or the property-level unit count. Note: existing `unit_number` column stays in DB for backward compat but is no longer collected |
| 13 | Allow additional custom fields | No custom field capability | "Add field" button at bottom of tenant form. Opens a key-value pair row (Label + Value). Multiple custom fields supported. Stored as JSONB |

### Step 4 --- Vendors

| # | Change | Current State | Proposed State |
|---|--------|--------------|----------------|
| 14 | Add vendor ranking | No ranking concept. Vendors have `preferred` boolean and `priority_rank` but no UI to set them | Dropdown or drag-to-rank for preference order (1st, 2nd, 3rd) per specialty. In the onboarding wizard (where few vendors exist), use a simple numeric select. On the /vendors page, add a drag-to-reorder or numbered-rank UI |
| 15 | Allow additional custom fields | Vendor form has: name, phone, email, specialty, notes | "Add field" button for custom key-value pairs (e.g., fax, address, contact person). Stored as JSONB |

## User Stories

### Landlord
- As a landlord, I want the wizard to say "agent" instead of "AI" or "Liz" so the language feels professional and product-agnostic.
- As a landlord, I want the auto-approve slider to actually work so I can set my threshold during onboarding.
- As a landlord, I want to enter an apartment/unit number on my property so multi-unit buildings are properly identified.
- As a landlord, I want to see which property I am adding tenants for so I do not get confused during onboarding.
- As a landlord, I want to record move-in date, lease type, and rent due date for each tenant so I have lease data in one place.
- As a landlord, I want phone numbers auto-formatted with dashes so they are easier to read.
- As a landlord, I do not want to enter a unit number on the tenant form since that is a property-level concept.
- As a landlord, I want to add custom fields to tenants and vendors for information unique to my workflow (e.g., fax number, emergency contact, gate code).
- As a landlord, I want to rank vendors by preference so the AI suggests my preferred contractor first.
- As a landlord, I want to understand the implications of my delegation + risk combo so I make an informed choice.

## Architecture

```
Affected components (existing):
  onboarding-wizard.tsx     -- Changes 1-5, 6, 7-13, 14-15
  option-card.tsx           -- No changes needed
  property-form.tsx         -- Change 6 (add apt_or_unit_no)
  tenant-form.tsx           -- Changes 8-13 (add fields, remove unit_number, phone mask, custom fields)
  vendor-form.tsx           -- Changes 14-15 (add ranking, custom fields)
  validations.ts            -- Schema updates for new fields
  types.ts                  -- TypeScript type updates

New components:
  phone-input.tsx           -- Reusable phone number input with auto-dash formatting
  custom-fields.tsx         -- Reusable "Add field" key-value pair component
  combo-note.tsx            -- Delegation + risk combo implication note

Affected pages:
  /onboarding               -- All 15 changes
  /properties               -- Change 6 (PropertyForm), Changes 8-13 (TenantForm)
  /vendors                  -- Changes 14-15 (VendorForm)
  /settings                 -- Changes 1-2 (terminology), Change 3 (slider fix)

Database:
  properties table          -- Add apt_or_unit_no column
  tenants table             -- Add move_in_date, lease_type, rent_due_day, custom_fields columns
  vendors table             -- Add custom_fields column
```

### Data Flow

```
PropertyForm
  |-- apt_or_unit_no (new) --> POST/PATCH /api/properties --> properties.apt_or_unit_no

TenantForm
  |-- move_in_date (new)   --> POST/PATCH /api/tenants --> tenants.move_in_date
  |-- lease_type (new)     --> POST/PATCH /api/tenants --> tenants.lease_type
  |-- rent_due_day (new)   --> POST/PATCH /api/tenants --> tenants.rent_due_day
  |-- custom_fields (new)  --> POST/PATCH /api/tenants --> tenants.custom_fields (JSONB)
  |-- phone (formatted)    --> strip dashes on save    --> tenants.phone (digits only)
  |-- unit_number (REMOVED from form; column kept in DB)

VendorForm
  |-- priority_rank (new UI) --> POST/PATCH /api/vendors --> vendors.priority_rank
  |-- custom_fields (new)    --> POST/PATCH /api/vendors --> vendors.custom_fields (JSONB)
```

## Tech Approach

### Phone Number Formatting (Change 11)

Create a `<PhoneInput />` wrapper around shadcn `<Input />` that:
1. On `onChange`: strips non-digit characters, then inserts dashes after positions 3 and 6
2. Limits to 10 digits (US format)
3. Displays formatted value: `714-243-3345`
4. On form submit: sends raw digits `7142433345` to the API
5. No external library needed --- a ~30-line utility function handles formatting

```typescript
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
```

### Custom Fields (Changes 13, 15)

Create a `<CustomFields />` component:
1. Renders existing key-value pairs from `custom_fields` JSONB
2. "Add field" button appends a new empty row
3. Each row has: Label input, Value input, Delete button
4. On save: serialize to `Record<string, string>` and store as JSONB
5. Reusable across tenant and vendor forms

```typescript
interface CustomField {
  key: string;
  value: string;
}
// Stored in DB as: { "fax": "714-555-0001", "gate_code": "1234" }
```

### Vendor Ranking (Change 14)

Two approaches depending on context:
- **Onboarding wizard** (few vendors, inline list): Simple `<Select>` dropdown per vendor with rank options (1st, 2nd, 3rd, etc.). When a rank is selected, any other vendor with that rank is bumped.
- **Vendors page** (potentially more vendors): Vendors grouped by specialty. Within each specialty group, a numbered rank column. Future enhancement: drag-to-reorder.

The existing `priority_rank` column on the `vendors` table already supports this. The UI just needs to expose it.

### Slider Bug Fix (Change 3, T-011)

The slider renders but does not respond to interaction. Root cause investigation needed during implementation. Likely causes:
- CSS `pointer-events: none` inherited from a parent
- The slider's container `div` intercepts click events
- Z-index stacking issue with the `OptionCard` button wrapper
- shadcn Slider version/config mismatch

The fix applies to both the onboarding wizard and the settings page since both render the same slider pattern.

### Combo Implication Notes (Change 5)

A lookup table maps `(risk_appetite, delegation_mode)` pairs to helpful notes:

```typescript
const COMBO_NOTES: Record<string, string> = {
  "manual_speed_first": "You've chosen to approve everything manually while prioritizing speed. Your agent will recommend fast vendors but wait for your approval.",
  "manual_cost_first": "You've chosen to approve everything manually while minimizing costs. Your agent will suggest the most affordable options for you to review.",
  "assist_speed_first": "Your agent will auto-approve small jobs under your threshold and prioritize fast vendors.",
  // ... etc
};
```

Displayed as a subtle `text-muted-foreground` note below the delegation cards. Only shown for combos that benefit from explanation.

### Autopilot Max Amount Design (Change 4)

Pre-design the UI but keep it hidden behind the "Coming soon" state:
- When autopilot is eventually enabled (Phase 2), selecting it reveals a `max_autopilot_spend` input field: "Maximum spending per job: $___"
- For now, add a small note under the disabled "Full autopilot" card: "When available, you'll set a maximum spending amount per job."
- No DB column needed yet --- add `max_autopilot_spend` to `landlord_profiles` in Phase 2.

## UI Development Process

### Step 1 Changes (AI Preferences)

**Terminology (Changes 1-2)**:
- `onboarding-wizard.tsx` line 358: Change `"Welcome to Liz! How should your AI prioritize?"` to `"Welcome to Liz! How should your Agent prioritize?"`
- `onboarding-wizard.tsx` line 391: Change `"How much should Liz handle on her own?"` to `"How much should your agent handle on its own?"`
- `settings/page.tsx`: Update matching labels in the "Risk Appetite" and "Delegation Mode" card titles if they reference "AI" (currently they say "AI Preferences" in the tab --- keep as-is since "AI Preferences" is a settings section name, not user-facing wizard text)

**Slider Fix (Change 3)**:
- Debug the `<Slider>` inside the conditional `{delegationMode === "assist" && (...)}` block
- The slider sits inside a `<div className="rounded-lg border bg-muted/30 p-4 space-y-3">` which itself is inside the `<CardContent>` of an `<OptionCard>`-like flow
- Verify that no parent `<button>` element is swallowing pointer events
- Test fix in both onboarding wizard and settings page

**Autopilot Note (Change 4)**:
- Below the disabled "Full autopilot" OptionCard, add:
  ```tsx
  <p className="text-xs text-muted-foreground ml-13 -mt-1">
    When available, you'll set a maximum spending amount per job.
  </p>
  ```

**Combo Notes (Change 5)**:
- New component: `components/onboarding/combo-note.tsx`
- Accepts `riskAppetite` and `delegationMode` props
- Returns a `<p>` with the relevant note, or `null` if no note needed
- Placed after the delegation mode cards, before the Next button

### Step 2 Changes (Property)

**Add Apt/Unit No. (Change 6)**:

Current `PropertyDraft` interface in `onboarding-wizard.tsx`:
```typescript
interface PropertyDraft {
  name: string;
  address: string;
  unit_count: string;
  monthly_rent: string;
}
```

Proposed:
```typescript
interface PropertyDraft {
  name: string;
  address: string;
  apt_or_unit_no: string;  // NEW
  unit_count: string;
  monthly_rent: string;
}
```

- Add the field between the address and the unit_count/monthly_rent grid
- Label: "Apt or Unit No." --- optional, no validation required
- Placeholder: "e.g. Suite 200, Unit B"
- Also update `PropertyForm` (`components/forms/property-form.tsx`) with the same field
- Update `PropertyFormData` interface to include `apt_or_unit_no`

### Step 3 Changes (Tenants)

**Prominent property name header (Change 7)**:

Current:
```tsx
<CardTitle className="flex items-center gap-2">
  <Users className="size-5" />
  Add tenants
</CardTitle>
<CardDescription>
  Add tenants for {property.name || "your property"}. You can always add more later.
</CardDescription>
```

Proposed:
```tsx
<CardTitle className="flex items-center gap-2">
  <Users className="size-5" />
  Add tenants for {property.name || "your property"}
</CardTitle>
<CardDescription>
  You can always add more later.
</CardDescription>
```

**New fields (Changes 8-10)**:

Add to `TenantEntry` in onboarding wizard and `TenantFormData` in `tenant-form.tsx`:
```typescript
interface TenantEntry {
  name: string;
  email: string;
  phone: string;
  // unit_number: string;  // REMOVED (Change 12)
  move_in_date: string;    // NEW (Change 8) - ISO date string
  lease_type: string;      // NEW (Change 9) - "yearly" | "month_to_month" | ""
  rent_due_day: string;    // NEW (Change 10) - "1" through "31" or ""
  custom_fields: CustomField[];  // NEW (Change 13)
}
```

Field layout in the form:
```
[Name]                          (full width, required)
[Email]         [Phone]         (2-col grid, phone uses PhoneInput)
[Move-in date]  [Lease type]    (2-col grid, both optional)
[Rent due day]                  (half width, optional)
[+ Add field]                   (custom fields section)
```

**Phone formatting (Change 11)**:
- Replace `<Input>` for phone with `<PhoneInput>` component
- Applies in both onboarding wizard inline form and standalone `TenantForm`
- Also apply to vendor phone fields for consistency

**Remove unit_number (Change 12)**:
- Remove the `unit_number` field from `TenantEntry`, `EMPTY_TENANT`, the inline onboarding form, and `TenantForm`
- Remove from tenant list display in the wizard (Step 3 list and Step 5 review)
- Keep the `unit_number` column in the `tenants` DB table for backward compatibility
- Remove from `tenantSchema` in `validations.ts` (or make it fully optional/deprecated)

**Custom fields (Change 13)**:
- Add `<CustomFields>` component below the standard fields
- Each custom field is a row: `[Label input] [Value input] [X delete]`
- "Add field" button at bottom
- Serialized to JSONB on save

### Step 4 Changes (Vendors)

**Vendor ranking (Change 14)**:

In the onboarding wizard vendor list:
- After adding a vendor, show a rank badge/number next to each vendor in the list
- When multiple vendors share a specialty, show a rank selector
- Simple approach: `<Select>` with "Preferred: 1st", "2nd", "3rd" options

In the standalone /vendors page:
- Add a "Rank" column or badge to vendor cards
- Group by specialty, show rank within group
- Use the existing `priority_rank` column

**Custom fields (Change 15)**:
- Same `<CustomFields>` component as tenants
- Add below the Notes field in `VendorForm`
- Common use cases: fax, physical address, contact person, license number

### Step 5 Changes (Review)

- Update the Tenants summary section to not show `unit_number`
- Show new fields in the summary: move-in date, lease type, rent due day
- Show custom fields count: "3 custom fields" or list them
- Show vendor ranks in the vendor summary section
- Update property summary to show apt/unit no. if provided

### Settings Page Changes

- Update terminology if any labels say "AI" in user-facing text (currently "AI Preferences" tab label --- this is acceptable as a section name)
- Fix the slider bug (same root cause as onboarding)
- Add the autopilot note to the disabled "Full autopilot" card

## Data Model

### Migration: Add columns to `properties`

```sql
alter table properties
  add column apt_or_unit_no text;
```

### Migration: Add columns to `tenants`

```sql
alter table tenants
  add column move_in_date date,
  add column lease_type text,           -- 'yearly' | 'month_to_month'
  add column rent_due_day int,          -- 1-31
  add column custom_fields jsonb default '{}';
```

### Migration: Add columns to `vendors`

```sql
alter table vendors
  add column custom_fields jsonb default '{}';
```

### Updated TypeScript Types (`lib/types.ts`)

```typescript
export interface Property {
  id: string;
  name: string;
  address: string;
  apt_or_unit_no: string | null;  // NEW
  unit_count: number | null;
  monthly_rent: number | null;
  landlord_id: string;
  created_at: string;
  tenants?: Tenant[];
}

export interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  unit_number: string | null;          // KEPT for backward compat, no longer collected
  move_in_date: string | null;         // NEW - ISO date
  lease_type: string | null;           // NEW - 'yearly' | 'month_to_month'
  rent_due_day: number | null;         // NEW - 1-31
  custom_fields: Record<string, string> | null;  // NEW
  property_id: string;
  clerk_user_id?: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  specialty: string;
  notes: string | null;
  landlord_id: string;
  preferred: boolean;
  priority_rank: number;
  custom_fields: Record<string, string> | null;  // NEW
}
```

### Updated Zod Schemas (`lib/validations.ts`)

```typescript
export const propertySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  apt_or_unit_no: z.string().max(50).optional().or(z.literal("")),  // NEW
  unit_count: z.number().int().min(1).max(999).default(1),
  monthly_rent: z.number().min(0).optional(),
});

export const tenantSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  // unit_number removed from active collection
  move_in_date: z.string().optional().or(z.literal("")),           // NEW
  lease_type: z.enum(["yearly", "month_to_month"]).optional(),     // NEW
  rent_due_day: z.number().int().min(1).max(31).optional(),        // NEW
  custom_fields: z.record(z.string()).optional(),                  // NEW
});

export const vendorSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  specialty: z.enum([
    "plumbing", "electrical", "hvac", "structural",
    "pest", "appliance", "general",
  ]),
  notes: z.string().max(1000).optional().or(z.literal("")),
  priority_rank: z.number().int().min(0).optional(),               // NEW (UI exposure)
  custom_fields: z.record(z.string()).optional(),                  // NEW
});
```

## Integration Points

### 1. API Routes

**`POST/PATCH /api/properties`** and **`POST/PATCH /api/properties/[id]`**:
- Accept `apt_or_unit_no` in the request body
- Pass through to Supabase insert/update

**`POST/PATCH /api/properties/[id]/tenants`** and **`PATCH /api/tenants/[id]`**:
- Accept `move_in_date`, `lease_type`, `rent_due_day`, `custom_fields`
- Phone number arrives as digits-only string (formatting is client-side)
- `unit_number` still accepted for backward compat but no longer sent by new forms

**`POST/PATCH /api/vendors`** and **`PATCH /api/vendors/[id]`**:
- Accept `priority_rank`, `custom_fields`

### 2. Onboarding Wizard Save (handleSaveAll)

The `handleSaveAll` function in `onboarding-wizard.tsx` sends all data on Step 5. Updates needed:
- Property payload: include `apt_or_unit_no`
- Tenant payloads: include `move_in_date`, `lease_type`, `rent_due_day`, `custom_fields`; remove `unit_number`
- Vendor payloads: include `priority_rank`, `custom_fields`

### 3. Properties Page

- `PropertyForm` gains the `apt_or_unit_no` field
- `TenantForm` loses `unit_number`, gains new fields
- Properties page displays `apt_or_unit_no` in the property card header if present

### 4. Vendors Page

- `VendorForm` gains `priority_rank` selector and custom fields
- Vendor cards show rank badge per specialty
- Optional future: drag-to-reorder within specialty groups

### 5. AI Integration (no changes in this feature)

The AI classification and dispatch routes do not need changes for these UX refinements. The new tenant/vendor data is informational for the landlord. Phase 2 can leverage lease data for rent reminders.

## Manual Testing Checklist

### Step 1 --- AI Preferences
- [ ] Header reads "How should your Agent prioritize?" (not "AI")
- [ ] Delegation header reads "How much should your agent handle on its own?" (not "Liz")
- [ ] Auto-approve slider responds to drag interaction
- [ ] Auto-approve slider responds to click-on-track interaction
- [ ] Slider value updates the displayed dollar amount in real time
- [ ] Selecting "I approve everything" hides the slider
- [ ] Selecting "Auto-approve small jobs" shows the slider
- [ ] "Full autopilot" card shows "Coming soon" badge and is disabled
- [ ] Note under Full autopilot reads "When available, you'll set a maximum spending amount per job."
- [ ] Selecting "I approve everything" + "Move Fast" shows combo implication note
- [ ] Selecting "Auto-approve small jobs" + "Balanced" shows no extra note (default combo)
- [ ] "Use default AI settings" skip link still works

### Step 2 --- Property
- [ ] "Apt or Unit No." field appears between Address and the units/rent grid
- [ ] Field is optional --- can proceed without filling it
- [ ] Value persists when navigating back and forward
- [ ] Value appears in Step 5 review summary

### Step 3 --- Tenants
- [ ] Header reads "Add tenants for {Property Name}" prominently
- [ ] Unit number field is NOT present
- [ ] Move-in date picker appears and accepts a date
- [ ] Lease type dropdown offers "Yearly" and "Month to Month"
- [ ] Rent due day accepts values 1-31
- [ ] Phone field auto-formats with dashes as user types (e.g., `714-243-3345`)
- [ ] Typing `7142433345` displays `714-243-3345`
- [ ] Deleting characters re-formats correctly
- [ ] "Add field" button appears at bottom of tenant form
- [ ] Can add a custom field with label and value
- [ ] Can add multiple custom fields
- [ ] Can delete a custom field
- [ ] Added tenant appears in the list with new field data
- [ ] Tenant list no longer shows "Unit X" designation

### Step 4 --- Vendors
- [ ] Vendor rank selector appears for each added vendor
- [ ] Can set rank 1st, 2nd, 3rd per vendor
- [ ] Setting rank on one vendor adjusts others if conflict
- [ ] "Add field" button appears at bottom of vendor form
- [ ] Can add custom fields (e.g., fax, address)
- [ ] Custom fields persist in the vendor list display

### Step 5 --- Review
- [ ] AI Preferences section reflects terminology changes
- [ ] Property section shows apt/unit no. if provided
- [ ] Tenant section does not show unit number
- [ ] Tenant section shows move-in date, lease type, rent due day if provided
- [ ] Tenant section shows custom fields count
- [ ] Vendor section shows rank per vendor
- [ ] "Start Managing" still saves all data and redirects to /dashboard

### Standalone Pages
- [ ] /properties: PropertyForm includes "Apt or Unit No." field
- [ ] /properties: TenantForm (add/edit sheet) has new fields, no unit_number
- [ ] /properties: Phone number formatting works in the tenant sheet form
- [ ] /vendors: VendorForm includes rank selector and custom fields
- [ ] /settings: Slider bug is fixed (same fix as onboarding)
- [ ] /settings: Terminology consistent (AI Preferences tab name unchanged, but any user-facing "AI" in card text updated to "Agent")

### Data Persistence
- [ ] New property with apt_or_unit_no saves to DB and reloads correctly
- [ ] Tenant with move_in_date, lease_type, rent_due_day saves and reloads
- [ ] Tenant custom_fields save as JSONB and reload correctly
- [ ] Vendor custom_fields save as JSONB and reload correctly
- [ ] Vendor priority_rank saves via UI and reloads correctly
- [ ] Editing an existing tenant preserves new fields
- [ ] Editing an existing vendor preserves new fields and rank

### Edge Cases
- [ ] Property with no apt/unit no. displays correctly (null/empty)
- [ ] Tenant with no optional fields (move-in, lease, custom) saves correctly
- [ ] Phone field with fewer than 10 digits formats correctly (e.g., `714-243` for 6 digits)
- [ ] Pasting a full phone number formats correctly
- [ ] Custom fields with empty label/value are stripped on save
- [ ] Duplicate custom field labels are allowed (no uniqueness constraint needed for MVP)
- [ ] Vendor rank of 0 (unranked) is the default
- [ ] Navigating back and forward preserves all new field data in the wizard

## Tasks

| ID | Tier | Title | Depends On |
|----|------|-------|------------|
| 025 | Haiku | Database migration --- add columns to properties, tenants, vendors | --- |
| 026 | Haiku | Update TypeScript types and Zod schemas for new fields | 025 |
| 027 | Sonnet | Fix auto-approve slider bug (T-011) in onboarding and settings | --- |
| 028 | Haiku | Create PhoneInput component with auto-dash formatting | --- |
| 029 | Haiku | Create CustomFields reusable component (key-value pairs) | --- |
| 030 | Sonnet | Update API routes to accept and persist new property/tenant/vendor fields | 025, 026 |
| 031 | Opus | Update onboarding wizard Step 1 --- terminology, combo notes, autopilot note | 027 |
| 032 | Opus | Update onboarding wizard Step 2 --- add apt_or_unit_no to property form | 026, 030 |
| 033 | Opus | Update onboarding wizard Step 3 --- tenant form overhaul (header, new fields, phone mask, remove unit_number, custom fields) | 026, 028, 029, 030 |
| 034 | Opus | Update onboarding wizard Step 4 --- vendor ranking + custom fields | 026, 029, 030 |
| 035 | Opus | Update onboarding wizard Step 5 --- review summary with all new fields | 031, 032, 033, 034 |
| 036 | Opus | Update standalone PropertyForm with apt_or_unit_no | 026, 030 |
| 037 | Opus | Update standalone TenantForm --- new fields, phone mask, custom fields, remove unit_number | 026, 028, 029, 030 |
| 038 | Opus | Update standalone VendorForm --- ranking UI + custom fields | 026, 029, 030 |
| 039 | Sonnet | Update settings page --- slider fix + terminology consistency | 027 |
| 040 | Haiku | Update onboarding wizard handleSaveAll to send new fields | 033, 034 |

**Tier breakdown**: 4 Haiku, 3 Sonnet, 7 Opus
**Critical path**: 025 --> 026 --> 030 --> 033 --> 035
**Parallel tracks**:
- Track A (no deps): 027 (slider fix), 028 (PhoneInput), 029 (CustomFields)
- Track B (after 025+026+030): 031, 032, 033, 034 can run in parallel
- Track C (after all form changes): 035 (review step), 040 (save handler)

## Open Questions

1. **Phone format: US-only?** --- The current design assumes US 10-digit format (XXX-XXX-XXXX). Should we support international formats? Recommendation: US-only for MVP. Add a country code prefix option in Phase 2.

2. **Custom fields limit** --- Should there be a maximum number of custom fields per tenant/vendor? Recommendation: Cap at 10 for MVP to avoid UI clutter and JSONB bloat.

3. **Vendor ranking granularity** --- Should ranking be global (across all specialties) or per-specialty? Recommendation: Global for now. The `priority_rank` column is already per-vendor. Per-specialty ranking adds complexity with little MVP value since most landlords have 1-2 vendors per specialty.

4. **Lease data usage** --- Move-in date, lease type, and rent due day are collected but not used by the AI in this feature. Should we add lease-expiry reminders? Recommendation: Defer to Phase 2 (P2-004 rent reminders). Collecting the data now means it is ready when that feature ships.

5. **Backward compatibility for unit_number removal** --- Existing tenants may have `unit_number` set. Should the TenantForm display it as read-only for existing records? Recommendation: Yes, show as a read-only "legacy" field if the tenant already has a unit_number. New tenants will not have it.

6. **Slider root cause** --- The slider bug (T-011) needs investigation. If the root cause is a shadcn version issue, it may require upgrading the component. If it is a CSS/event issue, it is a targeted fix. The task (027) should include root cause analysis before implementing the fix.
