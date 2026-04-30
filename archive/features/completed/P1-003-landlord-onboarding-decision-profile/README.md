# Feature: Landlord Onboarding & Decision Profile

**ID**: P1-003
**Ticket**: T-002
**Phase**: 1 — MVP

## TL;DR

Capture each landlord's management style (risk appetite, delegation mode, auto-approve threshold, vendor preferences) during onboarding, store it as a "decision profile," and use it to personalize AI triage and recommendations.

## Summary

Today the AI classifies maintenance requests the same way for every landlord. This feature adds a **decision profile** per landlord that tells the AI _how_ to make decisions — should it prioritize speed or cost? Can it auto-approve small jobs? Does the landlord prefer specific vendors?

This is the foundational building block for Phase 2 automation (P2-003 rule-based automation) and Phase 3 autonomy (P3-001). Without it, the AI is generic. With it, the AI adapts to each landlord's risk tolerance and decision style — the key product differentiator from `inbox/liz msg.md`.

The feature has three parts:
1. **Onboarding flow** — first-time setup wizard after landlord sign-up
2. **Settings page** — edit decision profile anytime
3. **AI integration** — classify and dispatch routes read the profile to adjust behavior

## User Stories

### Landlord
- As a new landlord, I want a guided onboarding that asks about my management style so the AI works the way I want from day one.
- As a landlord, I want to set my risk appetite (cost-first, speed-first, balanced) so AI vendor recommendations match my priorities.
- As a landlord, I want to set a max auto-approve amount (e.g., $150) so small repairs can be fast-tracked without my manual approval.
- As a landlord, I want to choose a delegation mode (manual, assist, auto) so I control how much the AI does on its own.
- As a landlord, I want to mark preferred vendors per specialty so the AI suggests them first.
- As a landlord, I want to change my decision profile anytime from a settings page.

## Architecture

```
Onboarding Wizard ──→ POST /api/settings/profile ──→ landlord_profiles table
       │
Settings Page ──────→ GET/PATCH /api/settings/profile
       │
       ▼
AI Classify Route ←── reads landlord profile
  │ adjusts: urgency thresholds, vendor ranking, auto-approve logic
  ▼
AI Dispatch Route ←── reads landlord profile
  │ checks: delegation mode, auto-approve amount
  ▼
Dashboard ←── shows current profile status
```

### New Route Group

```
apps/web/app/(landlord)/
├── onboarding/page.tsx          — Multi-step wizard (first-time only)
├── settings/page.tsx            — Edit decision profile + account settings
```

### New API Routes

```
/api/settings/profile    GET     — Fetch landlord's decision profile
/api/settings/profile    PUT     — Create or update decision profile
```

## Tech Approach

- **Onboarding wizard**: Single-page stepper using React state + shadcn `Card`, `Button`, `Progress`, `Select`, `Slider` (install needed). No form library — just 3 compact steps on one scrollable page.
- **Settings page**: Same form fields as onboarding, pre-filled with current values. Uses shadcn `Card` + `Tabs` for grouping. Standard edit/save pattern.
- **Profile storage**: New `landlord_profiles` table in Supabase. One row per landlord (1:1 with Clerk user).
- **AI integration**: `/api/classify` and `/api/requests/[id]/dispatch` read the profile before making decisions. The profile data is injected into the Claude prompt as context.
- **Redirect logic**: Dashboard page checks if profile exists on load; if not, redirects to `/onboarding`.

### Vendor Preferences

Rather than a separate table, vendor preferences are handled by adding a `preferred` boolean + `priority_rank` integer to the existing `vendors` table. The AI reads these when suggesting vendors.

## UI Development Process

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design landlord-onboarding-wizard       # Phase 1: Plan components + layout
/ui-build landlord-onboarding-wizard        # Phase 2: Build from plan
/ui-refine OnboardingWizard                 # Phase 3: Polish animations, a11y
/ui-refine SettingsPage                     # Phase 3: Polish settings
```

### Design Principles — Easiest Possible Onboarding

1. **Minimize steps**: 3 steps, not 5. Combine welcome + first question. Skip vendor prefs (they can do that from Vendors page).
2. **Smart defaults**: Pre-select "Balanced" + "Assist" + $150 threshold. Landlord can just click Next → Next → Done and get a good default.
3. **Single scroll page**: Not a multi-page wizard. One page with a progress bar and animated step transitions. No page loads.
4. **Skip button always visible**: "Skip for now — use defaults" at the top. Completes onboarding instantly with defaults.
5. **Mobile-first**: Cards stack vertically. Large touch targets. Options as big tappable cards, not radio buttons.
6. **Instant feedback**: Selected option highlights immediately. Progress bar updates. Micro-animations on transitions.

### shadcn Components Needed

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Step containers, option cards |
| `button` | Installed | Navigation, selection |
| `progress` | Installed | Step progress bar |
| `select` | Installed | Dropdown fallback |
| `badge` | Installed | "Recommended" / "Coming soon" tags |
| `separator` | Installed | Visual dividers |
| `slider` | **Needs install** | Auto-approve amount |
| `switch` | **Needs install** | Notification toggles (settings page) |
| `tabs` | Installed | Settings page sections |

### Component Hierarchy

```
OnboardingPage (apps/web/app/(landlord)/onboarding/page.tsx)
├── OnboardingWizard (components/onboarding/onboarding-wizard.tsx)
│   ├── Progress bar (step X of 3)
│   ├── "Skip — use defaults" link
│   ├── Step 1: RiskAppetiteStep
│   │   ├── 3× OptionCard (cost_first | balanced | speed_first)
│   │   └── Next button
│   ├── Step 2: DelegationModeStep
│   │   ├── 2× OptionCard (manual | assist) + 1× disabled (auto)
│   │   ├── AutoApproveSlider (conditional, shows when assist selected)
│   │   └── Next button
│   └── Step 3: ConfirmStep
│       ├── Summary card (your choices)
│       └── "Start Managing" button → POST profile → redirect /dashboard
└── (no sidebar, minimal chrome — centered layout like auth pages)

SettingsPage (apps/web/app/(landlord)/settings/page.tsx)
├── PageHeader ("Settings")
├── Tabs
│   ├── "AI Preferences" tab
│   │   ├── RiskAppetiteSelector (same cards as onboarding)
│   │   ├── DelegationModeSelector
│   │   └── AutoApproveSlider
│   └── "Notifications" tab
│       ├── Switch: Emergency alerts
│       └── Switch: All request alerts
└── Save button
```

## Data Model

### New Table: `landlord_profiles`

```sql
create table landlord_profiles (
  id uuid primary key default gen_random_uuid(),
  landlord_id text not null unique,  -- Clerk user ID (1:1)

  -- Risk & delegation
  risk_appetite text not null default 'balanced',
    -- 'cost_first' | 'speed_first' | 'balanced'
  delegation_mode text not null default 'assist',
    -- 'manual' (AI suggests, landlord approves everything)
    -- 'assist' (AI suggests + auto-approves below threshold)
    -- 'auto'   (AI acts, landlord reviews after)
  max_auto_approve decimal(10,2) default 0,
    -- Max dollar amount AI can auto-approve (0 = never auto-approve)

  -- Notifications
  notify_emergencies boolean not null default true,
  notify_all_requests boolean not null default false,

  -- Onboarding
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Modify Existing Table: `vendors`

```sql
alter table vendors
  add column preferred boolean not null default false,
  add column priority_rank int default 0;
```

### TypeScript Types

```typescript
export interface LandlordProfile {
  id: string;
  landlord_id: string;
  risk_appetite: 'cost_first' | 'speed_first' | 'balanced';
  delegation_mode: 'manual' | 'assist' | 'auto';
  max_auto_approve: number;
  notify_emergencies: boolean;
  notify_all_requests: boolean;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
}
```

## Integration Points

### 1. AI Classification (`/api/classify`)
The classify route currently sends a generic prompt. With the decision profile:
- **Risk appetite** adjusts urgency interpretation: `speed_first` landlords get more "emergency" classifications for borderline cases; `cost_first` landlords get more conservative urgency ratings.
- **Profile context** is appended to the Claude prompt:
  ```
  Landlord preferences: This landlord prioritizes {risk_appetite}.
  Consider this when rating urgency and recommending actions.
  ```

### 2. Vendor Suggestion (`/requests/[id]`)
- Sort vendors by `preferred` first, then by `priority_rank`
- For `cost_first` landlords: note in work order "Landlord prefers cost-effective solutions"
- For `speed_first` landlords: suggest vendors with fastest response times

### 3. Dispatch (`/api/requests/[id]/dispatch`)
- If `delegation_mode = 'assist'` and cost estimate < `max_auto_approve`: show "Auto-approved" badge, still save to DB
- If `delegation_mode = 'auto'`: dispatch happens automatically after classification (future — not in this feature)
- If `delegation_mode = 'manual'`: current behavior, landlord must click approve

### 4. Dashboard
- Show "Complete your setup" banner if `onboarding_completed = false`
- Show current delegation mode in a settings summary card

### 5. Middleware / Redirects
- After Clerk sign-in, if no `landlord_profiles` row exists → redirect to `/onboarding`
- After onboarding completes → redirect to `/dashboard`

## Onboarding Wizard Steps (3 Steps)

**Layout**: Centered card (like auth pages), no sidebar. Progress bar at top. "Skip — use defaults" link always visible.

### Step 1: Risk Appetite
**Header**: "Welcome to Liz! How should your AI prioritize?"
**Subtext**: "This affects how we rank urgency and pick vendors."

3 tappable option cards (large, icon + title + description):
- **Save Money** (icon: PiggyBank) — "Minimize repair costs. AI suggests the most affordable options." `cost_first`
- **Balanced** (icon: Scale) — "AI weighs both cost and speed equally." `balanced` — Badge: "Recommended", pre-selected
- **Move Fast** (icon: Zap) — "Minimize resolution time. AI prioritizes fast vendor response." `speed_first`

→ Next button

### Step 2: Delegation Mode
**Header**: "How much should Liz handle on her own?"
**Subtext**: "You can change this anytime in settings."

2 tappable option cards + 1 disabled:
- **I approve everything** (icon: ShieldCheck) — "AI classifies and suggests — you make every call." `manual`
- **Auto-approve small jobs** (icon: Sparkles) — "AI handles jobs under your threshold. You approve the rest." `assist` — Badge: "Recommended", pre-selected
  - When selected: Slider appears below → "Auto-approve up to: **$150**" (range $50–$500, step $25)
- **Full autopilot** (icon: Bot) — "AI handles routine jobs. You review after." `auto` — Badge: "Coming soon", disabled/grayed

→ Next button

### Step 3: Confirm & Go
**Header**: "You're all set!"
**Subtext**: "Here's how your AI will work:"

Summary card:
- Priority: {risk_appetite label}
- Mode: {delegation_mode label}
- Auto-approve: up to ${max_auto_approve} (or "Off" if manual)

→ "Start Managing" button (primary, large) → saves profile → redirects to `/dashboard`
→ "Go back" link to edit

## Manual Testing Checklist

### Onboarding Flow
- [ ] New landlord signs in → redirected to `/onboarding` (not dashboard)
- [ ] Progress bar shows "Step 1 of 3"
- [ ] "Skip — use defaults" link visible, clicking it saves defaults and goes to dashboard
- [ ] Step 1: "Balanced" pre-selected, can tap other options, highlight updates
- [ ] Step 2: "Auto-approve small jobs" pre-selected, slider shows at $150
- [ ] Step 2: Choosing "I approve everything" hides the slider
- [ ] Step 2: "Full autopilot" is grayed out with "Coming soon" badge
- [ ] Step 3: Summary shows selected choices correctly
- [ ] Step 3: "Start Managing" saves to DB and redirects to dashboard
- [ ] Revisiting `/onboarding` after completion redirects to dashboard

### Settings Page
- [ ] `/settings` shows current profile values pre-filled
- [ ] Can change risk appetite → saves
- [ ] Can change delegation mode → saves
- [ ] Can adjust auto-approve amount → saves
- [ ] Can toggle notification preferences → saves
- [ ] Changes reflected immediately in profile

### AI Integration
- [ ] Submit "Toilet overflowing" as tenant for a `cost_first` landlord → urgency/recommendation reflects cost priority
- [ ] Same request for `speed_first` landlord → recommendation reflects speed priority
- [ ] Vendor suggestions show preferred vendors first
- [ ] Auto-approve badge appears for requests under threshold (assist mode)

### Edge Cases
- [ ] Landlord with no vendors completes onboarding (skips step 4)
- [ ] Landlord sets auto-approve to $0 → no auto-approvals happen
- [ ] Landlord switches from assist to manual → auto-approve stops
- [ ] Profile loads correctly after page refresh

## Tasks

Tasks 016–024 in `backlog/`:

| ID | Tier | Title | Depends On |
|----|------|-------|------------|
| 016 | Haiku | Database migration — landlord_profiles table + vendor columns | — |
| 017 | Sonnet | Profile API routes — GET and PUT /api/settings/profile | 016 |
| 018 | Haiku | Install missing shadcn components — slider, switch | — |
| 019 | Opus | Build onboarding wizard UI — 3-step single-page wizard | 017, 018 |
| 020 | Opus | Build settings page UI — tabbed profile editor | 017, 018 |
| 021 | Sonnet | Inject decision profile into AI classify route | 017 |
| 022 | Sonnet | Dashboard onboarding banner + redirect logic | 017 |
| 023 | Sonnet | Sort vendors by preferred status and priority rank | 016 |
| 024 | Haiku | Unit tests for profile API routes | 017 |

**Tier breakdown**: 3 Haiku, 4 Sonnet, 2 Opus
**Dependency graph**: 016 + 018 are independent foundations → 017 depends on 016 → everything else depends on 017 or 018

## Open Questions

1. **"Auto" delegation mode for MVP?** — Recommendation: Show the option but disable it with "Coming soon." Full auto-dispatch requires more safety rails (escalation layer, spending limits per period). Defer to Phase 2.
2. **Notification preferences scope** — MVP: just boolean flags. Phase 2: connect to actual email/SMS via notification service.
3. **Multi-landlord profiles** — One profile per Clerk user. If a user manages multiple LLCs, they share one profile for now. Multi-profile support can be added later.
