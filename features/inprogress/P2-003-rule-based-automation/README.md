# Feature: Rule-based Automation

**ID**: P2-003
**Ticket**: T-006
**Phase**: 2

## TL;DR

Let landlords create custom automation rules with conditions and actions (e.g., "Auto-approve plumbing under $200," "Always assign VendorX for electrical," "Notify me for all emergencies even if auto-approved"). This replaces the single auto-approve threshold from P1-003 with a full rules engine, giving landlords granular control over how Liz handles each type of request.

## Summary

P1-003 gave landlords a decision profile with a single delegation mode and auto-approve threshold. That works for simple cases but quickly becomes limiting. A landlord might want to auto-approve cheap plumbing jobs but require manual approval for all electrical work. They might want VendorX for HVAC at their downtown property but VendorY at the suburban one. The single-threshold model cannot express these preferences.

This feature introduces a **rules engine** where landlords create condition-action pairs evaluated against incoming maintenance requests. Rules are evaluated in priority order after AI classification. When a rule matches, its actions fire automatically (auto-approve, assign vendor, notify, escalate). Multiple rules can match the same request -- actions accumulate, and the most restrictive approval wins.

This is the bridge between P1-003's static preferences and P3-001's full AI autonomy. Rules give landlords explicit, auditable control while enabling significantly more automation. The decision profile from P1-003 becomes the "default behavior" that applies when no rule matches.

The feature has four parts:
1. **Rules CRUD** -- create, read, update, delete, enable/disable, reorder rules
2. **Rule evaluation engine** -- server-side logic that evaluates rules against classified requests
3. **UI for rule management** -- visual rule builder, list, test tool
4. **Audit trail** -- record which rules fired on each request for transparency

## User Stories

### Landlord
- As a landlord, I want to create rules like "If plumbing AND under $200, auto-approve" so small routine repairs are handled instantly.
- As a landlord, I want to assign specific vendors to specific categories (e.g., "Always use Mike's Electric for electrical") so I do not have to pick a vendor each time.
- As a landlord, I want rules scoped to specific properties so my downtown building with older pipes gets different treatment than my newer property.
- As a landlord, I want to set a rule that always notifies me for emergencies, even when another rule auto-approves, so I am never blindsided by a major issue.
- As a landlord, I want to test a rule against a sample request before enabling it so I can verify it does what I expect.
- As a landlord, I want to enable/disable rules with a toggle so I can pause automation without deleting my rules.
- As a landlord, I want to see which rules fired on a specific request so I understand why the AI took a particular action.
- As a landlord, I want to reorder rules by priority so I can control which rule takes precedence when multiple rules match.
- As a landlord, I want a dashboard summary of my rules' activity so I can see how much automation is happening.

## Architecture

### Rule Evaluation Flow

```
Tenant submits request
        |
        v
POST /api/intake  -->  maintenance_requests (status: submitted)
        |
        v
POST /api/classify  -->  AI classifies: category, urgency, cost estimate
        |
        v
Rule Evaluation Engine (server-side)
  1. Load landlord's active rules, sorted by priority
  2. Load landlord's decision profile (P1-003 defaults)
  3. For each rule, check conditions against classified request
  4. Collect all matching rules + their actions
  5. Resolve conflicts (most restrictive approval wins)
  6. Execute actions:
     - auto_approve: dispatch to vendor if cost within rule threshold
     - assign_vendor: set vendor_id on request
     - notify: queue notification to landlord
     - escalate: mark request as requiring landlord attention
  7. Write rule_execution_logs for audit trail
        |
        v
Request updated with:
  - status: "auto_approved" | "triaged" | "escalated"
  - vendor_id (if assign_vendor action)
  - rule_execution_logs (which rules fired, what actions ran)
        |
        v
Dashboard / Request Detail shows results + audit trail
```

### Conflict Resolution

When multiple rules match:
- **Auto-approve vs. escalate**: Escalate wins. If any matching rule says "escalate," the request is escalated regardless of auto-approve rules.
- **Multiple vendor assignments**: The highest-priority rule's vendor assignment wins.
- **Notifications**: All notification actions from all matching rules fire (additive).
- **No matching rules**: Fall back to the P1-003 decision profile behavior (delegation_mode + max_auto_approve).

### Action Priority Order

When a classified maintenance request is processed, actions are applied in this order:

1. **Rule engine** — Evaluate all enabled rules in priority order. If any rules match, apply their actions (conflict resolution as above). Decision profile is ignored entirely.
2. **Decision profile fallback** — If no rules match, load the landlord's `landlord_profiles` row:
   - `delegation_mode = 'auto'`: auto-approve the request if `ai_cost_estimate_high <= max_auto_approve` (or `max_auto_approve = 0`, meaning no threshold). A `decision_profile` execution log entry is written.
   - `delegation_mode = 'manual'` or `'assist'`: no automatic action. Request stays in review.
3. **Default** — If no rules and no profile exist, request stays in review with no auto action.

Execution logs distinguish the source: `source_type = 'rule'` for rule-based actions, `source_type = 'decision_profile'` for profile-based actions.

### New Route Group

```
apps/web/app/(landlord)/
├── settings/
│   └── page.tsx                  -- Add "Automation Rules" tab (extends existing)

apps/web/app/api/
├── rules/
│   ├── route.ts                  -- GET (list), POST (create)
│   └── [id]/
│       ├── route.ts              -- GET, PUT, DELETE single rule
│       ├── reorder/route.ts      -- PATCH reorder priority
│       └── test/route.ts         -- POST test rule against sample request
├── rules/logs/route.ts           -- GET rule execution logs (for audit)
```

### New API Routes

```
/api/rules              GET     -- List landlord's rules (sorted by priority)
/api/rules              POST    -- Create a new rule
/api/rules/[id]         GET     -- Get single rule
/api/rules/[id]         PUT     -- Update a rule (conditions, actions, enabled)
/api/rules/[id]         DELETE  -- Delete a rule
/api/rules/[id]/reorder PATCH   -- Update rule priority
/api/rules/[id]/test    POST    -- Test rule against a sample request payload
/api/rules/logs         GET     -- Fetch rule execution logs (by request_id or date range)
```

## Tech Approach

### Rule Engine Design

The rule engine is a simple, deterministic evaluator -- not a general-purpose rules framework. It runs server-side in the `/api/classify` response handler (after AI classification completes) and in a shared `evaluateRules()` utility function.

**Rule structure**: Each rule has an array of conditions (AND-ed together) and an array of actions. A rule matches when ALL conditions are true.

**Conditions** (all optional, AND-ed):

| Condition | Type | Example |
|-----------|------|---------|
| `category` | enum[] | `["plumbing", "hvac"]` (matches any) |
| `urgency` | enum[] | `["low", "medium"]` (matches any) |
| `cost_max` | number | `200` (cost estimate high <= this value) |
| `cost_min` | number | `50` (cost estimate low >= this value) |
| `property_ids` | uuid[] | Specific properties (matches any) |
| `time_window` | object | `{ start: "08:00", end: "17:00", timezone: "America/New_York" }` |

**Actions** (at least one required):

| Action | Type | Effect |
|--------|------|--------|
| `auto_approve` | boolean | Auto-dispatch to assigned vendor |
| `assign_vendor_id` | uuid | Assign this vendor to the request |
| `notify` | object | `{ method: "email" | "sms" | "in_app", message?: string }` |
| `escalate` | boolean | Flag request for immediate landlord attention |

**Evaluation pseudocode**:

```typescript
function evaluateRules(
  request: ClassifiedRequest,
  rules: Rule[],
  profile: LandlordProfile
): RuleResult {
  const matchedRules: MatchedRule[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (matchesAllConditions(rule.conditions, request)) {
      matchedRules.push({ rule, actions: rule.actions });
    }
  }

  if (matchedRules.length === 0) {
    return applyProfileDefaults(request, profile);
  }

  return resolveActions(matchedRules);
}
```

**Where evaluation happens**: After `/api/classify` writes AI output to the maintenance request, a `processRules(requestId)` function is called. This function:
1. Loads the classified request
2. Loads the landlord's rules (via property -> landlord_id)
3. Calls `evaluateRules()`
4. Updates the request status and fields based on results
5. Writes `rule_execution_logs`

This keeps the rules engine decoupled from the classify route -- classify writes AI output, then hands off to rules processing.

### Technology Choices

- **No external rules engine library**: The rule conditions are simple enough (6 condition types, 4 action types) that a custom evaluator is clearer and more maintainable than integrating a library like `json-rules-engine`. We can always migrate later.
- **JSON columns for conditions/actions**: Stored as JSONB in Postgres. TypeScript interfaces enforce shape at the application layer. Zod validates on write.
- **Priority-based ordering**: Rules have an integer `priority` column. Lower numbers evaluate first. UI supports drag-to-reorder.
- **Soft limits**: MVP caps at 25 rules per landlord. Enough for any reasonable setup; prevents abuse.

## UI Development Process

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design rule-based-automation          # Phase 1: Plan all screens
/ui-build rule-based-automation           # Phase 2: Build from plan
/ui-refine RulesManager                   # Phase 3: Polish rule list
/ui-refine RuleBuilder                    # Phase 3: Polish builder
/ui-refine RuleTestPanel                  # Phase 3: Polish test tool
/ui-refine RuleAuditTrail                 # Phase 3: Polish audit trail
```

### Screen 1: Rules Manager (new tab in /settings)

**Location**: New "Automation Rules" tab added to the existing `/dashboard/settings` page, alongside "AI Preferences" and "Notifications."

**Purpose**: View all rules, toggle them on/off, reorder, and access the rule builder.

**Layout**:
- Tab header: "Automation Rules" with rule count badge (e.g., "5 rules")
- Empty state: Illustration + "No rules yet. Create your first automation rule to let Liz handle routine tasks." + "Create Rule" button
- Rule list: Vertical stack of rule cards, ordered by priority
- Each rule card shows:
  - Drag handle (left edge) for reordering
  - Rule name (bold) + human-readable summary (e.g., "Auto-approve plumbing under $200")
  - Conditions as small badges (e.g., "Plumbing" "< $200" "Downtown Apt")
  - Actions as small badges with icons (e.g., "[check] Auto-approve" "[user] Mike's Electric")
  - Enable/disable toggle (right side)
  - Overflow menu (...) with Edit, Test, Delete
- "Add Rule" button (bottom or top-right) opens Rule Builder
- Rule count approaching limit shows subtle warning: "22/25 rules"

**Component Hierarchy**:
```
SettingsPage (existing, extends current tabs)
├── Tabs
│   ├── "AI Preferences" tab (existing)
│   ├── "Notifications" tab (existing)
│   └── "Automation Rules" tab (NEW)
│       └── RulesManager
│           ├── RulesEmptyState (when no rules)
│           │   └── Button: "Create Rule"
│           ├── RulesList (sortable)
│           │   └── RuleCard[] (draggable)
│           │       ├── DragHandle
│           │       ├── RuleSummary (name + description)
│           │       ├── ConditionBadges[]
│           │       ├── ActionBadges[]
│           │       ├── Switch (enabled/disabled)
│           │       └── DropdownMenu (Edit, Test, Delete)
│           ├── Button: "Add Rule"
│           └── RuleLimitIndicator (shows X/25)
```

**shadcn Components**:

| Component | Status | Use |
|-----------|--------|-----|
| `tabs` | Installed | Extend existing settings tabs |
| `card` | Installed | Rule cards |
| `switch` | Installed | Enable/disable toggle |
| `badge` | Installed | Condition/action badges |
| `button` | Installed | Add Rule, actions |
| `dropdown-menu` | Installed | Rule card overflow menu |
| `dialog` | Installed | Delete confirmation |
| `alert-dialog` | Installed | Delete confirmation |
| `tooltip` | Installed | Badge hover explanations |
| `scroll-area` | Installed | Long rule lists |

**New component needed**: Drag-and-drop reordering. Use `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, accessible, React-native DnD). **Needs install.**

**Responsive Design**:
- Desktop: Rule cards in a single column, drag handles visible, badges wrap naturally
- Tablet: Same layout, slightly tighter spacing
- Mobile: Drag handles become a "Move up/Move down" button pair in the overflow menu. Cards stack full-width. Toggle remains inline.

**User Flow**:
1. Landlord navigates to Settings -> Automation Rules tab
2. Sees list of existing rules (or empty state)
3. Toggles rules on/off directly from the list
4. Clicks "Add Rule" to open the Rule Builder (Sheet/Dialog)
5. Clicks overflow menu -> Edit to modify an existing rule
6. Drags rules to reorder priority

### Screen 2: Rule Builder (Sheet or Dialog)

**Location**: Opens as a Sheet (slide-in panel from right) on desktop, full-screen dialog on mobile. Triggered from "Add Rule" or "Edit" in the Rules Manager.

**Purpose**: Visual builder for creating/editing a single rule with conditions and actions.

**Layout**:
- Header: "New Rule" or "Edit Rule" with close button
- Rule name input (text, required, e.g., "Auto-approve cheap plumbing")
- Divider
- **IF section** (Conditions):
  - "When a request matches ALL of these:" header
  - Condition rows, each with:
    - Condition type dropdown (Category, Urgency, Cost Range, Property, Time of Day)
    - Value selector (changes based on type):
      - Category: multi-select checkboxes (plumbing, electrical, hvac, structural, pest, appliance, general)
      - Urgency: multi-select checkboxes (low, medium, emergency)
      - Cost Range: two number inputs (min, max) with $ prefix
      - Property: multi-select dropdown of landlord's properties
      - Time of Day: two time pickers (start, end) + timezone select
    - Remove button (X)
  - "+ Add condition" button
  - If no conditions: helper text "This rule will match ALL requests"
- Divider
- **THEN section** (Actions):
  - "Do the following:" header
  - Action rows, each with:
    - Action type dropdown (Auto-approve, Assign Vendor, Notify Me, Escalate)
    - Value selector (changes based on type):
      - Auto-approve: toggle (just enabling the action is the value)
      - Assign Vendor: dropdown of landlord's vendors (filtered by category condition if set)
      - Notify Me: method selector (Email, SMS, In-app) + optional custom message
      - Escalate: toggle (just enabling the action is the value)
    - Remove button (X)
  - "+ Add action" button
  - At least one action is required -- show validation error if empty
- Divider
- Footer: "Save Rule" button (primary) + "Cancel" (ghost)

**Component Hierarchy**:
```
RuleBuilder (Sheet on desktop, Dialog on mobile)
├── SheetHeader / DialogHeader
│   └── "New Rule" / "Edit Rule"
├── SheetContent / DialogContent
│   ├── Input: Rule Name
│   ├── Separator
│   ├── ConditionsSection
│   │   ├── SectionHeader: "When a request matches ALL of these:"
│   │   ├── ConditionRow[] (dynamic)
│   │   │   ├── Select: Condition Type
│   │   │   ├── ConditionValueEditor (polymorphic)
│   │   │   │   ├── CategorySelector (checkbox group)
│   │   │   │   ├── UrgencySelector (checkbox group)
│   │   │   │   ├── CostRangeInput (two number inputs)
│   │   │   │   ├── PropertySelector (multi-select)
│   │   │   │   └── TimeWindowInput (time pickers + timezone)
│   │   │   └── Button: Remove (X icon)
│   │   ├── Button: "+ Add condition"
│   │   └── HelperText (when no conditions)
│   ├── Separator
│   ├── ActionsSection
│   │   ├── SectionHeader: "Do the following:"
│   │   ├── ActionRow[] (dynamic)
│   │   │   ├── Select: Action Type
│   │   │   ├── ActionValueEditor (polymorphic)
│   │   │   │   ├── AutoApproveToggle
│   │   │   │   ├── VendorSelector (dropdown)
│   │   │   │   ├── NotifyConfig (method + message)
│   │   │   │   └── EscalateToggle
│   │   │   └── Button: Remove (X icon)
│   │   ├── Button: "+ Add action"
│   │   └── ValidationError (when no actions)
│   └── Separator
├── SheetFooter / DialogFooter
│   ├── Button: "Save Rule" (primary)
│   └── Button: "Cancel" (ghost)
```

**shadcn Components**:

| Component | Status | Use |
|-----------|--------|-----|
| `sheet` | Installed | Desktop rule builder panel |
| `dialog` | Installed | Mobile rule builder |
| `input` | Installed | Rule name, cost values, custom message |
| `select` | Installed | Condition type, action type dropdowns |
| `label` | Installed | Form labels |
| `separator` | Installed | Section dividers |
| `button` | Installed | Add, remove, save, cancel |
| `switch` | Installed | Auto-approve, escalate toggles |
| `badge` | Installed | Selected categories/urgencies |
| `tooltip` | Installed | Help text on condition types |

**New components needed**: Checkbox group for multi-select categories/urgencies. Can be built from `checkbox` shadcn component. **`checkbox` needs install.**

**Responsive Design**:
- Desktop: Sheet slides in from right (480px wide), main content still visible
- Tablet: Same Sheet, slightly narrower
- Mobile: Full-screen Dialog. Condition/action rows stack vertically. Type dropdowns go full-width.

**User Flow**:
1. Landlord clicks "Add Rule" or "Edit" on existing rule
2. Sheet slides in with empty form (or pre-filled for edit)
3. Types a rule name
4. Adds conditions by clicking "+ Add condition", selecting type, and configuring values
5. Adds actions by clicking "+ Add action", selecting type, and configuring values
6. Clicks "Save Rule" -- validates (at least one action required), saves via API, closes sheet, refreshes list

### Screen 3: Rule Preview/Test Panel

**Location**: Accessible from the Rule Builder (a "Test this rule" button at the bottom of the builder, above Save) or from the overflow menu on a rule card.

**Purpose**: Landlord creates or selects a sample maintenance request, and the system shows exactly what the rule would do -- which conditions match, which actions would fire.

**Layout**:
- Opens as a collapsible section within the Rule Builder, or as a Dialog when triggered from the rule list
- **Sample Request section**:
  - Quick presets: "Cheap plumbing" "Expensive electrical" "Emergency HVAC" (pre-filled sample data)
  - Or manual entry:
    - Category dropdown
    - Urgency dropdown
    - Cost estimate (low/high inputs)
    - Property selector
    - Time override (optional)
  - "Run Test" button
- **Results section** (appears after test):
  - Condition-by-condition breakdown:
    - Each condition listed with a check (matched) or X (did not match)
    - Overall result: "Rule MATCHED" (green) or "Rule DID NOT MATCH" (red)
  - If matched, actions that would fire:
    - Each action listed with description of effect
    - e.g., "Would auto-approve and dispatch to Mike's Electric"
    - e.g., "Would send email notification"
  - If not matched, explanation of which condition failed

**Component Hierarchy**:
```
RuleTestPanel
├── SectionHeader: "Test this rule"
├── SampleRequestForm
│   ├── PresetButtons[] ("Cheap plumbing", "Expensive electrical", "Emergency HVAC")
│   ├── Separator with "or customize"
│   ├── Select: Category
│   ├── Select: Urgency
│   ├── Input: Cost Estimate Low
│   ├── Input: Cost Estimate High
│   ├── Select: Property
│   └── Button: "Run Test" (primary, sm)
├── TestResults (conditionally rendered)
│   ├── OverallResult
│   │   └── Badge: "MATCHED" (green) | "DID NOT MATCH" (muted)
│   ├── ConditionBreakdown
│   │   └── ConditionResult[] (check/x icon + condition description)
│   └── ActionPreview (only if matched)
│       └── ActionResult[] (icon + action description)
```

**shadcn Components**: All previously listed -- `select`, `input`, `button`, `badge`, `separator`. No new installs.

**Responsive Design**:
- Desktop: Inline within the Sheet, below the action section
- Mobile: Scrollable within the full-screen dialog

**User Flow**:
1. While building/editing a rule, landlord scrolls to "Test this rule" section
2. Clicks a preset or fills in custom values
3. Clicks "Run Test"
4. Sees condition-by-condition breakdown and whether actions would fire
5. Adjusts rule if needed, re-tests

### Screen 4: Active Rules Indicator on Request Detail

**Location**: New section on `/requests/[id]` page, in the right column below the AI Classification Card.

**Purpose**: Show which rules (if any) were evaluated and fired for this specific request. Provides an audit trail so landlords can understand why the AI took a particular action.

**Layout**:
- Card titled "Automation Rules" (or "Rules Applied")
- If no rules fired: "No automation rules matched this request. Default profile settings were applied." with link to Settings -> Rules tab
- If rules fired:
  - Each matched rule shown as a compact row:
    - Rule name (bold)
    - Actions taken: badges (e.g., "[check] Auto-approved" "[user] Assigned VendorX" "[bell] Notified")
    - Timestamp of when the rule was evaluated
  - At the bottom: "Edit rules" link to Settings -> Rules tab

**Component Hierarchy**:
```
RequestDetailPage (existing, extends right column)
├── AiClassificationCard (existing)
├── RuleAuditCard (NEW)
│   ├── CardHeader: "Rules Applied"
│   ├── CardContent
│   │   ├── RuleExecutionRow[] (for each matched rule)
│   │   │   ├── Rule name (text-sm font-medium)
│   │   │   ├── ActionBadges[] (tiny badges for each action taken)
│   │   │   └── Timestamp (text-xs text-muted-foreground)
│   │   └── NoRulesMessage (if none matched)
│   └── CardFooter
│       └── Link: "Edit rules" -> /dashboard/settings?tab=rules
├── CostEstimateCard (existing)
├── VendorSelector (existing)
├── ApproveButton (existing)
```

**shadcn Components**: `card`, `badge` -- both already installed.

**Responsive Design**:
- Desktop: In the sticky right column, between AI Classification and Cost Estimate
- Mobile: Stacks naturally in the single-column flow

### Screen 5: Rules Summary on Dashboard

**Location**: New card on `/dashboard` page, placed after the SectionCards (stats) row and before the SpendChart.

**Purpose**: At-a-glance summary of automation rule activity.

**Layout**:
- Small card (same width as a stat card, or half-width on desktop)
- Title: "Automation Rules"
- Stats:
  - "X active rules" (number + label)
  - "Y auto-approved this month" (number + label)
  - "Z requests processed by rules" (number + label)
- Footer link: "Manage rules" -> /dashboard/settings?tab=rules
- If no rules exist: "No automation rules. Set up rules to automate routine tasks." + "Get started" link

**Component Hierarchy**:
```
DashboardPage (existing, extends after SectionCards)
├── PageHeader (existing)
├── OnboardingBanner (existing, conditional)
├── EmergencyAlertBanner (existing)
├── SectionCards (existing)
├── RulesSummaryCard (NEW)
│   ├── CardHeader: "Automation Rules"
│   ├── CardContent
│   │   ├── StatRow: active rule count
│   │   ├── StatRow: auto-approved this month
│   │   └── StatRow: total processed by rules
│   └── CardFooter
│       └── Link: "Manage rules"
├── SpendChart (existing)
├── Recent Requests (existing)
```

**shadcn Components**: `card` -- already installed.

**Responsive Design**:
- Desktop: Half-width card inline with the stats row, or full-width compact card
- Mobile: Full-width card, stacks between stats and chart

## Data Model

### New Table: `automation_rules`

```sql
create table automation_rules (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null,          -- Clerk user ID
  name text not null,                 -- Human-readable name
  description text,                   -- Optional longer description (auto-generated from conditions/actions)
  enabled boolean not null default true,
  priority int not null default 0,    -- Lower = higher priority, evaluated first

  -- Rule definition (JSONB)
  conditions jsonb not null default '[]',
    -- Array of condition objects, AND-ed together
    -- Each: { type: "category" | "urgency" | "cost_max" | "cost_min" | "property" | "time_window",
    --         value: <varies by type> }
  actions jsonb not null default '[]',
    -- Array of action objects
    -- Each: { type: "auto_approve" | "assign_vendor" | "notify" | "escalate",
    --         value: <varies by type> }

  -- Metadata
  times_matched int not null default 0,  -- Counter for dashboard stats
  last_matched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_automation_rules_landlord on automation_rules(landlord_id);
create index idx_automation_rules_priority on automation_rules(landlord_id, priority);
```

### New Table: `rule_execution_logs`

```sql
create table rule_execution_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references maintenance_requests not null,
  rule_id uuid references automation_rules not null,
  landlord_id text not null,

  -- What happened
  matched boolean not null,           -- Did the rule match?
  conditions_result jsonb not null,   -- Per-condition pass/fail detail
  actions_executed jsonb,             -- Which actions actually ran (null if not matched)

  evaluated_at timestamptz default now()
);

create index idx_rule_logs_request on rule_execution_logs(request_id);
create index idx_rule_logs_rule on rule_execution_logs(rule_id);
create index idx_rule_logs_landlord_date on rule_execution_logs(landlord_id, evaluated_at);
```

### Modify Existing Table: `maintenance_requests`

```sql
alter table maintenance_requests
  add column auto_approved boolean not null default false,
  add column auto_approved_by_rule_id uuid references automation_rules,
  add column rules_evaluated_at timestamptz;
```

### TypeScript Types

```typescript
// Condition types
export type RuleConditionType =
  | "category"
  | "urgency"
  | "cost_max"
  | "cost_min"
  | "property"
  | "time_window";

export interface RuleCondition {
  type: RuleConditionType;
  value:
    | string[]           // category, urgency (array of enum values)
    | number             // cost_max, cost_min
    | string[]           // property (array of property UUIDs)
    | TimeWindow;        // time_window
}

export interface TimeWindow {
  start: string;         // "HH:mm" format
  end: string;           // "HH:mm" format
  timezone: string;      // IANA timezone (e.g., "America/New_York")
}

// Action types
export type RuleActionType =
  | "auto_approve"
  | "assign_vendor"
  | "notify"
  | "escalate";

export interface RuleAction {
  type: RuleActionType;
  value:
    | boolean            // auto_approve, escalate
    | string             // assign_vendor (vendor UUID)
    | NotifyConfig;      // notify
}

export interface NotifyConfig {
  method: "email" | "sms" | "in_app";
  message?: string;      // Optional custom message
}

// Full rule
export interface AutomationRule {
  id: string;
  landlord_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  times_matched: number;
  last_matched_at: string | null;
  created_at: string;
  updated_at: string;
}

// Rule execution log
export interface RuleExecutionLog {
  id: string;
  request_id: string;
  rule_id: string;
  landlord_id: string;
  matched: boolean;
  conditions_result: ConditionResult[];
  actions_executed: ExecutedAction[] | null;
  evaluated_at: string;
}

export interface ConditionResult {
  type: RuleConditionType;
  passed: boolean;
  expected: unknown;
  actual: unknown;
}

export interface ExecutedAction {
  type: RuleActionType;
  success: boolean;
  detail: string;        // Human-readable description of what happened
}

// Rule test request/response
export interface RuleTestRequest {
  conditions: RuleCondition[];
  actions: RuleAction[];
  sample: {
    category: string;
    urgency: string;
    cost_estimate_low: number;
    cost_estimate_high: number;
    property_id?: string;
    time_override?: string;   // ISO 8601 datetime
  };
}

export interface RuleTestResponse {
  matched: boolean;
  conditions_result: ConditionResult[];
  actions_preview: {
    type: RuleActionType;
    description: string;     // Human-readable "Would auto-approve and dispatch to Mike's Electric"
  }[];
}

// Dashboard stats extension
export interface RulesSummary {
  active_rules: number;
  auto_approved_this_month: number;
  total_processed_this_month: number;
}
```

### Zod Validation Schemas

Zod schemas will validate all rule creation and update payloads. Key validations:
- `conditions`: Array of valid condition objects, max 10 conditions per rule
- `actions`: Array of valid action objects, at least 1, max 5 per rule
- `name`: Required string, 1-100 characters
- `priority`: Non-negative integer
- Cross-validation: `assign_vendor` action references a valid vendor UUID (checked at API layer)
- Cross-validation: `property` condition references valid property UUIDs (checked at API layer)

## Integration Points

### 1. Post-Classification Hook (`/api/classify` or separate endpoint)

After AI classification writes `ai_category`, `ai_urgency`, `ai_cost_estimate_low`, `ai_cost_estimate_high` to the maintenance request, the rule evaluation engine runs:

```typescript
// In /api/classify response, after saving AI output:
await processRulesForRequest(requestId, landlordId);
```

This function:
1. Loads active rules for the landlord
2. Evaluates each against the classified request
3. Writes `rule_execution_logs`
4. Updates request status and fields based on actions
5. Updates `automation_rules.times_matched` and `last_matched_at` for matched rules

### 2. Decision Profile Fallback

When no rules match, the system falls back to P1-003 behavior:
- If `delegation_mode = 'assist'` and cost estimate < `max_auto_approve`, auto-approve
- If `delegation_mode = 'manual'`, leave as triaged for landlord approval
- The decision profile becomes the "catch-all default" rather than the primary decision mechanism

### 3. Request Detail Page (`/requests/[id]`)

Add `RuleAuditCard` to the right column. Fetch rule execution logs for the request:
```typescript
const logsRes = await fetch(`/api/rules/logs?request_id=${id}`);
```

### 4. Dashboard (`/dashboard`)

Add `RulesSummaryCard`. Fetch summary stats:
```typescript
const rulesRes = await fetch("/api/rules/summary");
```

New API endpoint: `GET /api/rules/summary` returns `RulesSummary`.

### 5. Settings Page (`/dashboard/settings`)

Extend the existing `Tabs` component with a third tab: "Automation Rules". Deep-link support: `/dashboard/settings?tab=rules` should auto-select the tab.

### 6. Vendor References

Rules can reference vendor IDs in `assign_vendor` actions. If a vendor is deleted, rules referencing it should be flagged (but not auto-deleted) -- show a warning badge on the rule card: "Vendor no longer exists."

### 7. Property References

Rules can reference property IDs in `property` conditions. If a property is deleted, same handling as vendors -- flag the rule with a warning.

## Manual Testing Checklist

### Rules Manager
- [ ] Navigate to Settings -> "Automation Rules" tab appears
- [ ] Empty state shows when no rules exist with "Create Rule" button
- [ ] "Create Rule" opens the Rule Builder sheet
- [ ] Creating a rule adds it to the list
- [ ] Rule card shows name, condition badges, action badges, toggle
- [ ] Toggle enables/disables a rule (API call, toast confirmation)
- [ ] Overflow menu shows Edit, Test, Delete options
- [ ] Delete shows confirmation dialog, deleting removes rule from list
- [ ] Drag-to-reorder updates priority (desktop)
- [ ] Move up/down buttons work (mobile)
- [ ] Rule count badge in tab header updates
- [ ] Limit indicator shows when approaching 25 rules

### Rule Builder
- [ ] "Add Rule" opens sheet with empty form
- [ ] "Edit" opens sheet pre-filled with existing rule data
- [ ] Rule name is required (validation error if empty)
- [ ] Can add multiple conditions with "+ Add condition"
- [ ] Category condition shows multi-select checkboxes
- [ ] Urgency condition shows multi-select checkboxes
- [ ] Cost range condition shows min/max number inputs
- [ ] Property condition shows dropdown of landlord's properties
- [ ] Time window condition shows time pickers + timezone
- [ ] Can remove individual conditions with X button
- [ ] At least one action is required (validation error if empty)
- [ ] Auto-approve action shows as toggle
- [ ] Assign vendor action shows vendor dropdown
- [ ] Notify action shows method selector + optional message
- [ ] Escalate action shows as toggle
- [ ] "Save Rule" creates/updates and closes sheet
- [ ] "Cancel" closes sheet without saving

### Rule Test
- [ ] Preset buttons fill in sample data correctly
- [ ] Custom values can be entered manually
- [ ] "Run Test" shows condition-by-condition breakdown
- [ ] Matched conditions show green checkmarks
- [ ] Failed conditions show red X marks
- [ ] Overall result shows "MATCHED" or "DID NOT MATCH"
- [ ] Matched rules show action preview descriptions
- [ ] Changing rule conditions and re-testing updates results

### Rule Evaluation (End-to-End)
- [ ] Submit a maintenance request that matches a rule
- [ ] AI classification triggers rule evaluation
- [ ] Auto-approve rule: request status changes to "auto_approved", vendor assigned
- [ ] Assign vendor rule: vendor_id set on request
- [ ] Notify rule: notification queued (or logged for MVP)
- [ ] Escalate rule: request flagged for attention
- [ ] Multiple matching rules: actions accumulate correctly
- [ ] Escalate overrides auto-approve
- [ ] No matching rules: falls back to decision profile behavior
- [ ] Rule execution logs written for all evaluated rules

### Audit Trail
- [ ] Request detail shows "Rules Applied" card in right column
- [ ] Card shows which rules matched and what actions were taken
- [ ] Card shows "no rules matched" when none applied
- [ ] "Edit rules" link navigates to Settings -> Rules tab

### Dashboard Summary
- [ ] Rules summary card shows on dashboard
- [ ] Shows correct active rule count
- [ ] Shows correct auto-approved count for current month
- [ ] Shows correct total processed count
- [ ] "Manage rules" link navigates to Settings -> Rules tab
- [ ] Empty state shows when no rules exist

### Edge Cases
- [ ] Rule with no conditions matches ALL requests (confirm warning shown during creation)
- [ ] Rule referencing a deleted vendor shows warning badge
- [ ] Rule referencing a deleted property shows warning badge
- [ ] 25 rules reached: "Add Rule" button disabled with tooltip
- [ ] Disabled rules are skipped during evaluation
- [ ] Concurrent rule evaluation (two requests processed simultaneously) does not corrupt state
- [ ] Rule with only escalate action works (does not require auto-approve)
- [ ] Time window condition respects timezone correctly

## Tasks

Tasks TBD (to be numbered when feature moves to in-progress):

| # | Tier | Title | Depends On |
|---|------|-------|------------|
| 1 | Haiku | Database migration -- automation_rules + rule_execution_logs tables + maintenance_requests columns | -- |
| 2 | Haiku | TypeScript types + Zod validation schemas for rules | 1 |
| 3 | Sonnet | Rules CRUD API routes -- GET/POST /api/rules, GET/PUT/DELETE /api/rules/[id] | 1, 2 |
| 4 | Sonnet | Rule reorder API route -- PATCH /api/rules/[id]/reorder | 3 |
| 5 | Sonnet | Rule test API route -- POST /api/rules/[id]/test | 2, 3 |
| 6 | Sonnet | Rule evaluation engine -- evaluateRules() + processRulesForRequest() | 1, 2 |
| 7 | Sonnet | Integrate rule evaluation into post-classification flow | 6 |
| 8 | Sonnet | Rule execution logs API -- GET /api/rules/logs | 1 |
| 9 | Sonnet | Rules summary API -- GET /api/rules/summary | 1 |
| 10 | Haiku | Install new shadcn components (checkbox) + dnd-kit | -- |
| 11 | Opus | Build Rules Manager UI -- settings tab, rule list, drag-reorder | 3, 10 |
| 12 | Opus | Build Rule Builder UI -- sheet/dialog, conditions, actions | 3, 5, 10 |
| 13 | Opus | Build Rule Test Panel UI -- sample request form, results display | 5, 12 |
| 14 | Opus | Build Rule Audit Card on Request Detail page | 8 |
| 15 | Opus | Build Rules Summary Card on Dashboard | 9 |
| 16 | Sonnet | Decision profile fallback integration -- rules override profile when present | 6, 7 |
| 17 | Sonnet | Stale reference detection -- flag rules with deleted vendors/properties | 3 |
| 18 | Haiku | Unit tests for rule evaluation engine | 6 |
| 19 | Haiku | Unit tests for rules API routes | 3, 4, 5 |

**Tier breakdown**: 4 Haiku, 8 Sonnet, 5 Opus (front-end work is always Opus per CLAUDE.md)

**Dependency graph**:
- Task 1 (migration) + Task 10 (component installs) are independent foundations
- Task 2 (types) depends on 1
- Tasks 3-5 (API routes) depend on 1, 2
- Task 6 (evaluation engine) depends on 1, 2
- Task 7 (integration) depends on 6
- Tasks 8, 9 (log/summary APIs) depend on 1
- Tasks 11-15 (UI) depend on their respective API routes + Task 10
- Tasks 16-17 (integration) depend on the evaluation engine + API routes
- Tasks 18-19 (tests) depend on the code they test

## Open Questions

1. **Should rules fully replace the decision profile, or supplement it?** -- Recommendation: Supplement. The decision profile remains the fallback for requests that match no rules. Landlords who never create rules get the same P1-003 experience. Landlords who create rules get more granular control. The "assist" delegation mode + max_auto_approve effectively becomes "Rule 0" that is always active as a default.

2. **Rule limit per landlord?** -- Recommendation: 25 rules for MVP. This covers any realistic use case (7 categories x 3 urgencies x a few properties). Can be raised per plan tier later.

3. **Should disabled rules show in evaluation logs?** -- Recommendation: No. Only active rules appear in logs. Disabled rules are skipped entirely during evaluation. This keeps logs clean and avoids confusion.

4. **Notification actions in MVP?** -- MVP does not have a notification delivery system (email/SMS). Recommendation: Log the notification intent in rule_execution_logs and show it in the audit trail UI. Add a "Notifications" section to the request detail showing "Rule X would have notified you via email." Wire up actual delivery when the notification service is built (P2-001 Rent Reminder may create this infrastructure).

5. **Time-of-day conditions: worth the complexity?** -- Recommendation: Include in the schema/types but do not build the UI for it in the first pass. Focus on category, urgency, cost, and property conditions -- those cover 95% of use cases. Time-of-day can be added as a follow-up without schema changes.

6. **What status should auto-approved requests get?** -- Recommendation: New status `auto_approved` (distinct from `approved` and `dispatched`). This makes it clear in the UI and data that automation acted, not the landlord. The flow becomes: `submitted` -> `triaged` -> `auto_approved` -> `dispatched` (when vendor confirms). Or keep it simple for MVP: `submitted` -> `triaged` -> `dispatched` with `auto_approved = true` flag. Leaning toward the flag approach to avoid adding a new status that complicates all existing status checks.

7. **Should the rule builder use a visual flowchart (node-based editor)?** -- Recommendation: No. IF-THEN with condition/action rows is sufficient and far simpler to build. A node editor adds significant complexity for no user benefit at this scale. Revisit if rules become more complex in P3.
