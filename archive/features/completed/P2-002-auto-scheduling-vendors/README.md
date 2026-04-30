# Feature: Auto-scheduling Vendors

**ID**: P2-002
**Ticket**: T-005
**Phase**: 2

## TL;DR

After a landlord approves a maintenance request and selects a vendor, Liz automatically coordinates scheduling between the vendor's availability and the tenant's availability, suggests optimal time slots using AI, and sends confirmed appointment details to both parties via email/SMS.

## Summary

Today, "dispatching" a vendor means saving a work order to the database. The landlord still has to pick up the phone, call the vendor, negotiate a time, then call the tenant to confirm access. This manual back-and-forth adds hours of friction to every maintenance request.

This feature closes the loop by automating the entire scheduling handshake:

1. **Vendor availability** -- landlords set recurring availability windows for each vendor (e.g., "Mon-Fri 8am-5pm, no weekends"). Vendors can also self-manage availability via an emailed link.
2. **Tenant availability** -- after a request is approved, the tenant is prompted in-app to select when they are available for the repair visit. Simple date+time slot picker, no account required for the initial prompt.
3. **AI schedule matching** -- Claude analyzes both calendars, the urgency of the request, and the landlord's decision profile (speed-first vs cost-first) to suggest the best time slots.
4. **Automated notifications** -- once a slot is confirmed, both vendor and tenant receive an email (and optionally SMS) with the appointment details, address, and work order summary.
5. **Reschedule flow** -- either party can request a reschedule, which triggers a new availability collection round.

This feature depends on:
- P1-003 (Decision Profile) -- the landlord's `risk_appetite` influences scheduling priority (speed-first landlords get same-day suggestions first; cost-first landlords may prefer regular-hours slots to avoid overtime charges).
- P1-001 (Maintenance Intake MVP) -- the dispatch flow this feature extends.

## User Stories

### Landlord
- As a landlord, I want to set recurring availability for each of my vendors so the system knows when they can be scheduled.
- As a landlord, I want to see available time slots after approving a request so I can pick a slot or let the AI suggest one.
- As a landlord, I want Liz to notify the vendor and tenant automatically so I do not have to make phone calls.
- As a landlord, I want to see the confirmed appointment on the request detail page so I always know the schedule status.
- As a landlord, I want to be notified if either party requests a reschedule so I can intervene if needed.
- As a landlord who prioritizes speed, I want the AI to suggest the earliest possible slot, even if it is after hours.
- As a landlord who prioritizes cost, I want the AI to suggest regular-hours slots to avoid overtime vendor charges.

### Tenant
- As a tenant, I want to be prompted to select my available times after my request is approved so the repair is scheduled around my schedule.
- As a tenant, I want to see the confirmed appointment time on my request detail page so I know when to expect the vendor.
- As a tenant, I want to receive an email/SMS confirmation with the appointment details.
- As a tenant, I want to request a reschedule if the confirmed time no longer works for me.

### Vendor (via notifications -- no vendor portal in this phase)
- As a vendor, I want to receive an email/SMS with the confirmed appointment time, address, work order, and tenant contact info.
- As a vendor, I want a link in the notification to request a reschedule if I cannot make the time.

## Architecture

### Scheduling Flow Diagram

```
 LANDLORD approves request + selects vendor
         │
         ▼
 ┌──────────────────────────┐
 │ POST /api/requests/[id]/ │
 │        dispatch           │  (existing route, extended)
 └────────────┬─────────────┘
              │
              ▼
 ┌──────────────────────────┐     ┌────────────────────────┐
 │ Create scheduling_tasks  │────→│ Send tenant prompt      │
 │ row (status: pending)    │     │ (email + in-app badge)  │
 └────────────┬─────────────┘     └────────────────────────┘
              │
              │  Tenant submits availability
              ▼
 ┌──────────────────────────┐
 │ POST /api/scheduling/    │
 │   [id]/tenant-availability│
 └────────────┬─────────────┘
              │
              ▼
 ┌──────────────────────────────────────────┐
 │ AI Schedule Matcher                      │
 │  - Reads vendor_availability_rules       │
 │  - Reads tenant_availability_windows     │
 │  - Reads landlord_profile (risk_appetite)│
 │  - Reads request urgency                 │
 │  - Generates ranked slot suggestions     │
 └────────────┬────────────────────────────┘
              │
              ▼
 ┌──────────────────────────┐
 │ Scheduling Modal         │
 │ (landlord picks or       │
 │  accepts AI suggestion)  │
 └────────────┬─────────────┘
              │
              ▼
 ┌──────────────────────────┐
 │ POST /api/scheduling/    │
 │      [id]/confirm        │
 └────────────┬─────────────┘
              │
              ├──→ Update scheduling_tasks.status = confirmed
              ├──→ Email/SMS to vendor (Resend + Twilio)
              ├──→ Email/SMS to tenant
              └──→ Update maintenance_requests.status = scheduled
                          │
                          ▼
                   ┌────────────┐
                   │  Repair    │
                   │  happens   │
                   └─────┬──────┘
                         │
                         ▼
                   status = resolved

 ── RESCHEDULE FLOW ──

 Either party clicks "Request Reschedule" link
         │
         ▼
 ┌──────────────────────────┐
 │ POST /api/scheduling/    │
 │    [id]/reschedule       │
 └────────────┬─────────────┘
              │
              ├──→ scheduling_tasks.status = rescheduling
              ├──→ Notify landlord
              └──→ Re-enter availability collection
```

### New Route Group

```
apps/web/app/(landlord)/
├── vendors/page.tsx                         (MODIFY — add availability section)

apps/web/app/(tenant)/
├── my-requests/[id]/page.tsx                (MODIFY — add schedule view + availability picker)

apps/web/app/api/
├── scheduling/
│   ├── [id]/
│   │   ├── suggest/route.ts                 POST — AI generates slot suggestions
│   │   ├── tenant-availability/route.ts     POST — tenant submits available windows
│   │   ├── confirm/route.ts                 POST — landlord confirms a slot
│   │   └── reschedule/route.ts              POST — either party requests reschedule
│   └── route.ts                             GET  — list scheduling tasks for landlord
├── vendors/
│   └── [id]/
│       └── availability/route.ts            GET/PUT — vendor availability rules CRUD
```

### New API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/vendors/[id]/availability` | Fetch vendor's availability rules |
| PUT | `/api/vendors/[id]/availability` | Create/update vendor availability rules |
| GET | `/api/scheduling` | List scheduling tasks for the authenticated landlord |
| POST | `/api/scheduling/[id]/tenant-availability` | Tenant submits their available windows |
| POST | `/api/scheduling/[id]/suggest` | AI generates ranked time slot suggestions |
| POST | `/api/scheduling/[id]/confirm` | Landlord confirms a time slot |
| POST | `/api/scheduling/[id]/reschedule` | Either party initiates a reschedule |

### Status Lifecycle Extension

The `maintenance_requests.status` field gains a new state:

```
submitted -> triaged -> approved -> dispatched -> scheduled -> resolved -> closed
                                                   ^^^^^^^
                                                   NEW STATE
```

`dispatched` means the work order is saved and vendor assigned. `scheduled` means a confirmed appointment exists.

## Tech Approach

### Notification Service Recommendation: Resend (email) + Twilio (SMS)

**Email -- Resend** (over SendGrid):
- Built for developers, excellent Next.js/Vercel integration
- React-based email templates via `@react-email/components`
- Free tier: 100 emails/day (sufficient for MVP; small landlords with 1-20 units will send at most a few scheduling emails per day)
- Simple API: one `resend.emails.send()` call
- No domain verification needed for testing (sends from `onboarding@resend.dev`)
- Pricing scales well: $20/mo for 50k emails

**SMS -- Twilio** (standard choice):
- Industry standard, well-documented
- Free trial includes test numbers
- Per-message pricing ($0.0079/SMS) suits low-volume MVP
- Already noted in decision log as Phase 2 plan

**Implementation pattern**: A `NotificationService` abstraction layer in `lib/notifications/` that wraps both Resend and Twilio. API routes call `notificationService.sendScheduleConfirmation(...)` without knowing the transport. This makes it easy to add push notifications later.

```
lib/notifications/
├── index.ts                 — NotificationService class + factory
├── email.ts                 — Resend email transport
├── sms.ts                   — Twilio SMS transport
└── templates/
    ├── schedule-confirmed.tsx   — React Email template
    ├── schedule-reschedule.tsx  — Reschedule request template
    └── availability-prompt.tsx  — Tenant availability prompt
```

### AI Schedule Matching

Claude (Sonnet) receives a structured prompt with:
- Vendor availability rules (recurring weekly patterns + date overrides)
- Tenant availability windows (specific date+time ranges they submitted)
- Request urgency (emergency/medium/low)
- Landlord risk appetite (speed_first/balanced/cost_first)
- Current date/time context

The AI returns a JSON array of ranked suggestions:
```json
{
  "suggestions": [
    {
      "start": "2026-04-10T09:00:00",
      "end": "2026-04-10T11:00:00",
      "reason": "Earliest overlapping slot. Vendor available 8am-5pm, tenant available 9am-12pm.",
      "score": 0.95
    }
  ]
}
```

For emergency requests, the AI prioritizes same-day or next-day slots. For cost-first landlords, it prefers regular business hours to avoid overtime charges.

### Vendor Availability Model

Availability is stored as recurring rules (not individual calendar events) to keep it simple:

- **Recurring weekly**: "Every Monday 8am-5pm, Tuesday 8am-5pm, ..."
- **Date overrides**: "Not available April 15" or "Available April 20 10am-2pm only"
- Stored as JSONB for flexibility -- no need for a separate availability slots table

This approach means landlords do not need to manage a vendor's full calendar. They set the vendor's general working hours once and add exceptions as needed.

### Tenant Availability Collection

When a request transitions to `dispatched`, the system:
1. Creates a `scheduling_tasks` row (status: `awaiting_tenant`)
2. Sends the tenant an in-app prompt (badge on request detail) and email
3. The tenant sees a simple picker: select one or more date+time windows over the next 7 days
4. No complex calendar widget -- just a grid of available day-parts (morning/afternoon/evening) for the next 7 days, plus an optional specific-time refinement

### Token-based Vendor Reschedule

Vendors do not have accounts. Reschedule links in email/SMS contain a signed JWT token (short-lived, 72h) that authorizes a single action: request reschedule for a specific scheduling task. The API validates the token without requiring authentication.

## UI Development Process

Use the three-phase pipeline from `docs/ui-process.md`:

```
/ux-design vendor-availability-manager       # Phase 1: Plan vendor availability UI
/ui-build vendor-availability-manager        # Phase 2: Build it
/ui-refine VendorAvailabilityManager         # Phase 3: Polish

/ux-design scheduling-modal                  # Phase 1: Plan scheduling modal
/ui-build scheduling-modal                   # Phase 2: Build it
/ui-refine SchedulingModal                   # Phase 3: Polish

/ux-design tenant-availability-picker        # Phase 1: Plan tenant prompt
/ui-build tenant-availability-picker         # Phase 2: Build it
/ui-refine TenantAvailabilityPicker          # Phase 3: Polish

/ux-design schedule-confirmation-view        # Phase 1: Plan confirmation cards
/ui-build schedule-confirmation-view         # Phase 2: Build it
/ui-refine ScheduleConfirmationCard          # Phase 3: Polish
```

### Design Principles

1. **Minimize landlord effort**: Vendor availability is set once, not per request. The AI suggests slots -- landlord just confirms.
2. **Tenant simplicity**: No calendar widget overload. A grid of day-parts (morning/afternoon/evening) for the next 7 days. One tap per block.
3. **Progressive disclosure**: The scheduling modal only appears after dispatch. Availability management is tucked into the vendor edit flow, not a separate page.
4. **Mobile-first**: All scheduling UIs must work on phone screens. Tenants especially will be on mobile.
5. **Clear status communication**: Both parties always know what is happening -- "Waiting for tenant availability", "Confirmed: Thursday 9am-11am", "Reschedule requested".
6. **Fail gracefully**: If the tenant never responds, the landlord can still manually confirm a slot or call the tenant.

### shadcn Components Needed

| Component | Status | Use |
|-----------|--------|-----|
| `dialog` | Installed | Scheduling modal |
| `card` | Installed | Availability display, confirmation cards |
| `button` | Installed | Confirm, reschedule actions |
| `badge` | Installed | Status indicators ("Awaiting tenant", "Confirmed") |
| `select` | Installed | Time slot selection |
| `input` | Installed | Custom time input |
| `tabs` | Installed | Vendor availability: weekly view vs overrides |
| `switch` | Installed | Toggle day on/off in availability |
| `label` | Installed | Form labels |
| `separator` | Installed | Visual dividers |
| `table` | Installed | Availability overview grid |
| `tooltip` | Installed | Hover info on time slots |
| `scroll-area` | Installed | Scrollable slot lists in modal |
| `skeleton` | Installed | Loading states |
| `calendar` | **Needs install** | Date picker for overrides + tenant availability |
| `popover` | **Needs install** | Calendar popover container |
| `toggle-group` | **Needs install** | Day-of-week selector in vendor availability |

### Screen 1: Vendor Availability Manager (Landlord)

**Location**: Added as a new section within the existing vendor edit Sheet, and also as a dedicated tab on the vendor card.

**User Flow**:
1. Landlord goes to `/vendors`
2. Clicks "Edit" on a vendor card
3. The existing Sheet now has two sections: "Details" (existing form) and "Availability" (new)
4. In the Availability section, landlord sees a weekly grid
5. Toggle each day on/off, set start/end times for active days
6. Optionally add date-specific overrides (vacation days, special hours)
7. Save updates all at once

**Component Hierarchy**:

```
VendorsPage (apps/web/app/(landlord)/vendors/page.tsx) — EXISTING, modified
├── VendorCard — EXISTING
│   └── (NEW) AvailabilityBadge
│       └── Badge: "Mon-Fri 8a-5p" or "No availability set"
│
└── Sheet (vendor edit) — EXISTING, extended
    ├── SheetHeader
    ├── Tabs
    │   ├── "Details" tab — VendorForm (existing)
    │   └── "Availability" tab — VendorAvailabilityForm (NEW)
    │       ├── WeeklyScheduleGrid
    │       │   ├── DayRow (x7)
    │       │   │   ├── Switch (day enabled/disabled)
    │       │   │   ├── Label ("Monday")
    │       │   │   ├── Select (start time, 30-min increments)
    │       │   │   ├── Separator ("to")
    │       │   │   └── Select (end time, 30-min increments)
    │       │   └── "Copy to all weekdays" Button (convenience)
    │       ├── Separator
    │       ├── DateOverrides section
    │       │   ├── "Add Override" Button
    │       │   ├── OverrideRow[] (existing overrides)
    │       │   │   ├── Calendar popover (pick date)
    │       │   │   ├── Select (type: "unavailable" | "custom hours")
    │       │   │   ├── Time selects (if custom hours)
    │       │   │   └── Delete button
    │       │   └── EmptyState ("No date overrides")
    │       └── SheetFooter
    │           └── Save Button
    └── SheetFooter
```

**Responsive Strategy**:
- **Desktop**: DayRow lays out horizontally -- Switch | Label | Start | "to" | End
- **Mobile**: DayRow stacks -- Switch + Label on first line, Start-End on second line
- Time Selects use native `<select>` on mobile for better UX (scroll wheel)

### Screen 2: Scheduling Modal (Landlord)

**Location**: Appears on `/requests/[id]` after the landlord clicks "Approve & Dispatch". Replaces the current immediate-dispatch behavior with a two-step flow: dispatch then schedule.

**User Flow**:
1. Landlord on request detail page clicks "Approve & Dispatch" (existing flow)
2. Dispatch saves the work order and vendor assignment (existing behavior)
3. Immediately after dispatch succeeds, a scheduling modal opens
4. Modal shows: "Schedule [Vendor Name] for this repair"
5. If tenant has already submitted availability: show overlapping slots with AI suggestions highlighted
6. If tenant has not yet responded: show vendor-only available slots with a note "Waiting for tenant availability -- you can schedule now or wait"
7. Landlord picks a slot or clicks "Let AI pick the best slot"
8. Confirmation step: "Confirm Thursday, April 10, 9:00 AM - 11:00 AM?"
9. On confirm: sends notifications, updates status to `scheduled`
10. "Skip scheduling" option: closes modal, status stays at `dispatched` (landlord will schedule manually)

**Component Hierarchy**:

```
SchedulingModal (components/scheduling/scheduling-modal.tsx) — NEW
├── Dialog
│   ├── DialogHeader
│   │   ├── DialogTitle: "Schedule Repair Visit"
│   │   └── DialogDescription: vendor name + request summary
│   ├── DialogContent
│   │   ├── SchedulingStatusBanner
│   │   │   ├── (if awaiting_tenant) Badge "Waiting for tenant" + info text
│   │   │   └── (if tenant_responded) Badge "Tenant available" + count of windows
│   │   ├── Separator
│   │   ├── AiSuggestionCard (if suggestions exist)
│   │   │   ├── Badge "AI Recommended"
│   │   │   ├── Slot display: "Thu Apr 10, 9:00 AM - 11:00 AM"
│   │   │   ├── Reason text: "Earliest overlap. Vendor + tenant both free."
│   │   │   └── Button "Use this slot"
│   │   ├── Separator
│   │   ├── SlotPicker
│   │   │   ├── DateSelector (horizontal scroll of next 7-14 days)
│   │   │   │   └── DateChip[] (day name + date, highlighted if slots available)
│   │   │   ├── TimeSlotGrid (for selected date)
│   │   │   │   └── TimeSlotButton[] (30-min increments)
│   │   │   │       ├── available + overlapping: solid primary
│   │   │   │       ├── vendor-only available: outline, muted
│   │   │   │       ├── tenant-only available: outline, dashed
│   │   │   │       └── unavailable: disabled/hidden
│   │   │   └── Legend
│   │   │       ├── Badge "Both available" (solid)
│   │   │       ├── Badge "Vendor only" (outline)
│   │   │       └── Badge "Tenant only" (dashed)
│   │   ├── SelectedSlotSummary (appears when slot picked)
│   │   │   ├── Card with date, time, vendor, tenant
│   │   │   └── Duration estimate based on category
│   │   └── Separator
│   └── DialogFooter
│       ├── Button "Confirm & Notify" (primary, disabled until slot selected)
│       ├── Button "Skip Scheduling" (ghost)
│       └── (loading state: spinner + "Sending notifications...")
```

**Responsive Strategy**:
- **Desktop**: Modal is 600px wide. DateSelector is a horizontal row. TimeSlotGrid is a 4-column grid (morning/afternoon columns).
- **Tablet**: Modal is full-width with padding. Same layout.
- **Mobile**: Modal becomes a Drawer (bottom sheet). DateSelector scrolls horizontally. TimeSlotGrid stacks to 2 columns. Selected slot summary is sticky at bottom.

### Screen 3: Tenant Availability Prompt

**Location**: Appears on the tenant's `/my-requests/[id]` page when the request status is `dispatched` and a scheduling task exists with status `awaiting_tenant`.

**User Flow**:
1. Tenant's request gets approved and dispatched
2. Tenant receives an email: "Your repair has been scheduled! Please select your available times."
3. Tenant opens their request detail page (or clicks email link)
4. At the top of the page, a prominent card says: "When are you available for the repair visit?"
5. Below: a 7-day grid showing morning (8am-12pm), afternoon (12pm-5pm), evening (5pm-8pm) blocks
6. Tenant taps to toggle blocks on/off (multi-select)
7. Optional: "Add specific times" expander for more precision
8. Submit button: "Send my availability"
9. After submitting: card updates to "Availability sent! We will confirm your appointment soon."

**Component Hierarchy**:

```
TenantRequestDetailPage (apps/web/app/(tenant)/my-requests/[id]/page.tsx) — MODIFIED
├── (existing content)
├── (NEW) TenantAvailabilityPrompt (components/scheduling/tenant-availability-prompt.tsx)
│   ├── Card (prominent, border-primary when action needed)
│   │   ├── CardHeader
│   │   │   ├── CardTitle: "When are you available?"
│   │   │   └── CardDescription: "Select times over the next 7 days when you can be home for the repair."
│   │   ├── CardContent
│   │   │   ├── DayPartGrid
│   │   │   │   ├── GridHeader: ["", "Morning (8a-12p)", "Afternoon (12p-5p)", "Evening (5p-8p)"]
│   │   │   │   └── GridRow[] (next 7 days)
│   │   │   │       ├── DayLabel: "Mon Apr 10"
│   │   │   │       ├── ToggleButton "Morning" (tap to select/deselect)
│   │   │   │       ├── ToggleButton "Afternoon"
│   │   │   │       └── ToggleButton "Evening"
│   │   │   ├── Separator
│   │   │   ├── Collapsible "Add specific times (optional)"
│   │   │   │   └── SpecificTimeInput[]
│   │   │   │       ├── Calendar popover (date)
│   │   │   │       ├── Select (start time)
│   │   │   │       └── Select (end time)
│   │   │   └── HelpText: "The more times you select, the sooner we can schedule."
│   │   └── CardFooter
│   │       └── Button "Send My Availability" (primary, full-width on mobile)
│   └── (submitted state)
│       └── Card (border-green)
│           ├── CheckCircle icon
│           ├── "Availability sent!"
│           └── "We'll confirm your appointment time soon."
│
├── (NEW) ScheduleConfirmationCard (if status = scheduled)
│   └── (see Screen 4 below)
```

**Responsive Strategy**:
- **Desktop**: DayPartGrid is a table with 4 columns (day + 3 time blocks)
- **Mobile**: DayPartGrid becomes a vertical list. Each day is a row with 3 toggle buttons side-by-side. Touch targets are 44px minimum.
- Toggle buttons use `toggle-group` component with large tap targets
- The entire prompt card is visually prominent (thicker border, subtle background) to encourage action

### Screen 4: Schedule Confirmation View

**Location**: Appears on both the landlord's `/requests/[id]` and the tenant's `/my-requests/[id]` when the scheduling task status is `confirmed`.

**User Flow**:
1. After the landlord confirms a slot, both the request detail page and the tenant's view show a confirmation card.
2. Card shows: confirmed date/time, vendor name, estimated duration, address.
3. Countdown: "In 2 days" or "Tomorrow at 9:00 AM".
4. Reschedule button available for either party.

**Component Hierarchy**:

```
ScheduleConfirmationCard (components/scheduling/schedule-confirmation-card.tsx) — NEW
├── Card (border-green when confirmed, border-yellow when rescheduling)
│   ├── CardHeader
│   │   ├── CalendarCheck icon (green) or CalendarClock icon (yellow)
│   │   ├── CardTitle: "Repair Visit Confirmed" or "Reschedule Requested"
│   │   └── Badge: "Confirmed" / "Rescheduling"
│   ├── CardContent
│   │   ├── DetailRow: Calendar icon + "Thursday, April 10, 2026"
│   │   ├── DetailRow: Clock icon + "9:00 AM - 11:00 AM"
│   │   ├── DetailRow: Wrench icon + "FastFix Plumbing" (vendor name)
│   │   ├── DetailRow: MapPin icon + "123 Main St, Unit 4B" (property + unit)
│   │   ├── Separator
│   │   └── CountdownText: "In 2 days" / "Tomorrow" / "Today"
│   └── CardFooter
│       └── Button "Request Reschedule" (outline variant)
│           └── opens RescheduleDialog

RescheduleDialog (components/scheduling/reschedule-dialog.tsx) — NEW
├── Dialog
│   ├── DialogTitle: "Request Reschedule"
│   ├── Textarea: "Reason (optional)"
│   └── DialogFooter
│       ├── Button "Cancel"
│       └── Button "Request Reschedule" (destructive variant)
```

**Responsive Strategy**:
- Card is full-width on all breakpoints
- On mobile, detail rows stack cleanly with proper spacing
- Reschedule button is full-width on mobile

### Screen 5: Reschedule Flow

**Location**: Triggered from the confirmation card (Screen 4) or from a tokenized link in vendor emails/SMS.

**User Flow (tenant/landlord in-app)**:
1. Click "Request Reschedule" on the confirmation card
2. RescheduleDialog opens: optional reason text area
3. Submit: scheduling task moves to `rescheduling` status
4. Landlord is notified (in-app + email)
5. Tenant is re-prompted with the availability picker (Screen 3)
6. Flow returns to the scheduling modal (Screen 2) for the landlord

**User Flow (vendor via email link)**:
1. Vendor receives email with "Cannot make this time? Request a reschedule" link
2. Link contains a signed JWT token
3. Opens a minimal public page: `/schedule/reschedule?token=xxx`
4. Page shows the appointment details and a "Confirm Reschedule Request" button + optional reason
5. On submit: same flow as above

**Component Hierarchy (public reschedule page)**:

```
PublicReschedulePage (apps/web/app/schedule/reschedule/page.tsx) — NEW
├── Centered layout (like auth pages, no sidebar)
├── Card
│   ├── CardHeader
│   │   ├── Liz logo
│   │   └── CardTitle: "Reschedule Repair Visit"
│   ├── CardContent
│   │   ├── Appointment summary (date, time, address)
│   │   ├── Separator
│   │   ├── Textarea: "Reason (optional)"
│   │   └── HelpText: "The landlord will be notified and a new time will be coordinated."
│   └── CardFooter
│       └── Button "Request Reschedule"
├── (success state)
│   └── Card: "Reschedule requested. The landlord has been notified."
└── (invalid token state)
    └── Card: "This link has expired. Please contact your landlord directly."
```

## Data Model

### New Table: `vendor_availability_rules`

```sql
create table vendor_availability_rules (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors not null unique,

  -- Recurring weekly schedule (JSONB)
  -- Format: { "monday": { "enabled": true, "start": "08:00", "end": "17:00" }, ... }
  weekly_schedule jsonb not null default '{
    "monday":    { "enabled": true,  "start": "08:00", "end": "17:00" },
    "tuesday":   { "enabled": true,  "start": "08:00", "end": "17:00" },
    "wednesday": { "enabled": true,  "start": "08:00", "end": "17:00" },
    "thursday":  { "enabled": true,  "start": "08:00", "end": "17:00" },
    "friday":    { "enabled": true,  "start": "08:00", "end": "17:00" },
    "saturday":  { "enabled": false, "start": "08:00", "end": "12:00" },
    "sunday":    { "enabled": false, "start": "08:00", "end": "12:00" }
  }'::jsonb,

  -- Date-specific overrides (JSONB array)
  -- Format: [{ "date": "2026-04-15", "type": "unavailable" },
  --          { "date": "2026-04-20", "type": "custom", "start": "10:00", "end": "14:00" }]
  date_overrides jsonb not null default '[]'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_vendor_avail_vendor on vendor_availability_rules(vendor_id);
```

### New Table: `scheduling_tasks`

```sql
create table scheduling_tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references maintenance_requests not null,
  vendor_id uuid references vendors not null,
  tenant_id uuid references tenants not null,

  status text not null default 'awaiting_tenant',
    -- awaiting_tenant: waiting for tenant to submit availability
    -- ready_to_schedule: tenant responded, landlord can pick a slot
    -- confirmed: appointment confirmed, notifications sent
    -- rescheduling: reschedule requested, re-collecting availability
    -- cancelled: scheduling abandoned

  -- Tenant's submitted availability windows (JSONB array)
  -- Format: [{ "date": "2026-04-10", "start": "09:00", "end": "12:00" },
  --          { "date": "2026-04-10", "start": "17:00", "end": "20:00" }]
  tenant_availability jsonb default '[]'::jsonb,
  tenant_availability_submitted_at timestamptz,

  -- AI-generated suggestions (JSONB array)
  -- Format: [{ "start": "2026-04-10T09:00", "end": "2026-04-10T11:00",
  --            "reason": "...", "score": 0.95 }]
  ai_suggestions jsonb default '[]'::jsonb,

  -- Confirmed appointment
  confirmed_start timestamptz,
  confirmed_end timestamptz,
  confirmed_at timestamptz,
  confirmed_by text,  -- Clerk user ID of who confirmed

  -- Reschedule tracking
  reschedule_reason text,
  reschedule_requested_by text,  -- 'tenant', 'vendor', or 'landlord'
  reschedule_requested_at timestamptz,
  reschedule_count int not null default 0,

  -- Notification tracking
  vendor_notified_at timestamptz,
  tenant_notified_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_scheduling_request on scheduling_tasks(request_id);
create index idx_scheduling_status on scheduling_tasks(status);
```

### New Table: `notification_log`

```sql
create table notification_log (
  id uuid primary key default gen_random_uuid(),
  scheduling_task_id uuid references scheduling_tasks,
  recipient_type text not null,      -- 'vendor', 'tenant', 'landlord'
  recipient_email text,
  recipient_phone text,
  channel text not null,             -- 'email', 'sms'
  template text not null,            -- 'schedule_confirmed', 'availability_prompt', 'reschedule_request'
  status text not null default 'sent',  -- 'sent', 'delivered', 'failed'
  external_id text,                  -- Resend message ID or Twilio SID
  error_message text,
  sent_at timestamptz default now()
);

create index idx_notification_scheduling on notification_log(scheduling_task_id);
```

### Modify Existing Table: `maintenance_requests`

```sql
-- Add 'scheduled' to the status lifecycle
-- No schema change needed (status is text), but document the new valid value:
-- submitted -> triaged -> approved -> dispatched -> scheduled -> resolved -> closed
```

### TypeScript Types

```typescript
// Vendor availability
export interface WeeklyDaySchedule {
  enabled: boolean;
  start: string; // "HH:mm" format
  end: string;
}

export interface WeeklySchedule {
  monday: WeeklyDaySchedule;
  tuesday: WeeklyDaySchedule;
  wednesday: WeeklyDaySchedule;
  thursday: WeeklyDaySchedule;
  friday: WeeklyDaySchedule;
  saturday: WeeklyDaySchedule;
  sunday: WeeklyDaySchedule;
}

export interface DateOverride {
  date: string; // "YYYY-MM-DD"
  type: 'unavailable' | 'custom';
  start?: string; // "HH:mm", only if type = 'custom'
  end?: string;
}

export interface VendorAvailabilityRules {
  id: string;
  vendor_id: string;
  weekly_schedule: WeeklySchedule;
  date_overrides: DateOverride[];
}

// Scheduling
export interface TenantAvailabilityWindow {
  date: string;     // "YYYY-MM-DD"
  start: string;    // "HH:mm"
  end: string;      // "HH:mm"
}

export interface AiScheduleSuggestion {
  start: string;    // ISO datetime
  end: string;      // ISO datetime
  reason: string;
  score: number;    // 0-1
}

export type SchedulingStatus =
  | 'awaiting_tenant'
  | 'ready_to_schedule'
  | 'confirmed'
  | 'rescheduling'
  | 'cancelled';

export interface SchedulingTask {
  id: string;
  request_id: string;
  vendor_id: string;
  tenant_id: string;
  status: SchedulingStatus;
  tenant_availability: TenantAvailabilityWindow[];
  tenant_availability_submitted_at: string | null;
  ai_suggestions: AiScheduleSuggestion[];
  confirmed_start: string | null;
  confirmed_end: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  reschedule_reason: string | null;
  reschedule_requested_by: 'tenant' | 'vendor' | 'landlord' | null;
  reschedule_requested_at: string | null;
  reschedule_count: number;
  vendor_notified_at: string | null;
  tenant_notified_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  vendors?: { id: string; name: string; phone: string | null; email: string | null };
  tenants?: { id: string; name: string; phone: string | null; email: string | null; unit_number: string | null };
  maintenance_requests?: { id: string; ai_category: string | null; ai_urgency: string | null; property_id: string };
}
```

## Integration Points

### 1. Dispatch Route (`/api/requests/[id]/dispatch`)

**Current behavior**: Updates request status to `dispatched`, saves vendor_id and work_order_text.

**Extended behavior**: After successful dispatch, create a `scheduling_tasks` row with status `awaiting_tenant`. Trigger a notification to the tenant prompting them to submit availability.

```typescript
// After existing dispatch logic succeeds:
const { data: schedulingTask } = await supabase
  .from('scheduling_tasks')
  .insert({
    request_id: id,
    vendor_id,
    tenant_id: existing.tenant_id,
    status: 'awaiting_tenant',
  })
  .select()
  .single();

// Send availability prompt to tenant
await notificationService.sendAvailabilityPrompt({
  tenantEmail: tenant.email,
  tenantPhone: tenant.phone,
  requestId: id,
  vendorName: vendor.name,
  propertyAddress: property.address,
});
```

### 2. Request Detail Page (`/requests/[id]`)

**Current behavior**: Shows request info, vendor selector, approve button.

**Extended behavior**:
- After dispatch, show a "Scheduling" section below the work order
- If `scheduling_tasks.status = awaiting_tenant`: show "Waiting for tenant availability" status card
- If `scheduling_tasks.status = ready_to_schedule`: show "Schedule Now" button that opens the scheduling modal
- If `scheduling_tasks.status = confirmed`: show the ScheduleConfirmationCard with date/time
- If `scheduling_tasks.status = rescheduling`: show "Reschedule in progress" status card

### 3. Tenant Request Detail (`/my-requests/[id]`)

**Current behavior**: Read-only view of request details and AI classification.

**Extended behavior**:
- If `scheduling_tasks.status = awaiting_tenant`: show TenantAvailabilityPrompt card at the top
- If `scheduling_tasks.status = confirmed`: show ScheduleConfirmationCard with reschedule option
- If `scheduling_tasks.status = rescheduling`: show "Reschedule in progress -- you will be prompted again soon"

### 4. AI Classification (`/api/classify`)

**No change** for this feature. Classification happens before scheduling.

### 5. Vendor Page (`/vendors`)

**Extended behavior**:
- Vendor edit Sheet gains an "Availability" tab with the VendorAvailabilityForm
- Vendor cards show a small availability summary badge (e.g., "Mon-Fri 8a-5p")
- Vendors without availability rules show "No availability set" badge with a subtle prompt to configure

### 6. Decision Profile Integration

The AI schedule suggestion prompt includes the landlord's `risk_appetite`:
- `speed_first`: "Prioritize the earliest available slot, even if outside standard business hours."
- `cost_first`: "Prioritize slots during standard business hours (8am-5pm weekdays) to minimize overtime charges."
- `balanced`: "Balance speed and cost. Suggest the earliest business-hours slot."

### 7. Dashboard

Add a "Pending Schedules" count to the dashboard stats, showing how many dispatched requests are awaiting scheduling completion. This gives landlords visibility into the scheduling pipeline without a dedicated page.

### 8. Notification Service (New)

```
lib/notifications/index.ts
```

Central `NotificationService` class with methods:
- `sendAvailabilityPrompt(params)` -- email + optional SMS to tenant
- `sendScheduleConfirmation(params)` -- email + optional SMS to vendor and tenant
- `sendRescheduleRequest(params)` -- email to landlord + other party
- `sendRescheduleConfirmation(params)` -- email + SMS to all parties after rescheduling

Each method logs to the `notification_log` table for debugging and audit.

## Manual Testing Checklist

### Vendor Availability Setup
- [ ] Edit a vendor -> "Availability" tab visible
- [ ] Default schedule shows Mon-Fri 8am-5pm, Sat-Sun disabled
- [ ] Toggle Saturday on -> time selects appear
- [ ] Change Monday start to 10am -> save succeeds
- [ ] "Copy to all weekdays" sets all weekday times to match
- [ ] Add a date override (April 15, unavailable) -> saves
- [ ] Add a date override (April 20, custom 10am-2pm) -> saves
- [ ] Delete a date override -> saves
- [ ] Vendor card shows availability summary badge
- [ ] Vendor with no availability shows "No availability set"

### Dispatch to Scheduling Flow
- [ ] Approve a request with a vendor who has availability set
- [ ] After dispatch, scheduling modal appears
- [ ] Request status shows "dispatched"
- [ ] Tenant receives availability prompt email
- [ ] Tenant's request detail shows availability picker

### Tenant Availability
- [ ] Tenant sees the availability prompt card on their request detail
- [ ] Day-part grid shows next 7 days with morning/afternoon/evening blocks
- [ ] Tap to select/deselect time blocks -- multi-select works
- [ ] "Add specific times" expander opens with date+time inputs
- [ ] Submit availability -> card updates to "Availability sent!" state
- [ ] Re-visiting the page still shows "Availability sent!" (no re-prompt)

### AI Schedule Suggestions
- [ ] After tenant submits availability, landlord's scheduling view shows AI suggestions
- [ ] Suggestions show overlapping vendor + tenant windows
- [ ] Speed-first landlord gets earliest slot suggested first
- [ ] Cost-first landlord gets business-hours slot suggested first
- [ ] "Use this slot" selects the AI suggestion in the slot picker

### Scheduling Modal (Landlord)
- [ ] Modal opens after dispatch or from "Schedule Now" button
- [ ] DateSelector shows next 14 days with availability indicators
- [ ] Clicking a date shows available time slots
- [ ] Overlapping vendor+tenant slots are highlighted (solid)
- [ ] Vendor-only slots are outlined (muted)
- [ ] Selecting a slot shows the SelectedSlotSummary
- [ ] "Confirm & Notify" button enabled only after selecting a slot
- [ ] "Skip Scheduling" closes modal, status stays at dispatched
- [ ] Confirming shows loading state then success

### Schedule Confirmation
- [ ] Landlord's request detail shows ScheduleConfirmationCard
- [ ] Tenant's request detail shows ScheduleConfirmationCard
- [ ] Card shows correct date, time, vendor, address
- [ ] Countdown text shows "In X days" / "Tomorrow" / "Today"
- [ ] Request status is "scheduled"

### Notifications
- [ ] Tenant receives availability prompt email after dispatch
- [ ] Vendor receives confirmation email with work order, address, tenant contact
- [ ] Tenant receives confirmation email with date, time, vendor name
- [ ] All emails render correctly (check React Email preview)
- [ ] notification_log entries created for each sent message
- [ ] SMS sends if phone number is available and SMS is configured

### Reschedule Flow
- [ ] Tenant clicks "Request Reschedule" on confirmation card
- [ ] RescheduleDialog opens, can add optional reason
- [ ] After submitting: scheduling task status = rescheduling
- [ ] Landlord receives reschedule notification
- [ ] Tenant is re-prompted with availability picker
- [ ] Landlord can re-schedule from the scheduling modal
- [ ] `reschedule_count` increments

### Vendor Reschedule (via email link)
- [ ] Vendor's confirmation email contains a "Request Reschedule" link
- [ ] Link opens public reschedule page with appointment summary
- [ ] Vendor can submit reschedule request with optional reason
- [ ] Success page shown after submission
- [ ] Expired/invalid token shows appropriate error message
- [ ] Token expires after 72 hours

### Edge Cases
- [ ] Vendor with no availability set -> scheduling modal shows warning, allows manual time entry
- [ ] Tenant never responds -> landlord can still pick a slot from vendor-only availability
- [ ] Request with no tenant email -> in-app prompt only, no email sent
- [ ] Multiple reschedules on the same request (verify `reschedule_count` tracks correctly)
- [ ] Emergency request -> AI suggests same-day slot if any vendor availability exists
- [ ] Scheduling modal with no overlapping slots -> clear message, suggest expanding windows
- [ ] Two scheduling tasks for the same request (should not happen -- enforce unique constraint)

## Tasks

Tasks for `backlog/`:

| ID | Tier | Title | Depends On |
|----|------|-------|------------|
| 025 | Haiku | Database migration -- vendor_availability_rules, scheduling_tasks, notification_log tables | -- |
| 026 | Haiku | Install missing shadcn components -- calendar, popover, toggle-group | -- |
| 027 | Haiku | TypeScript types -- VendorAvailabilityRules, SchedulingTask, notification types | 025 |
| 028 | Sonnet | Vendor availability API routes -- GET/PUT /api/vendors/[id]/availability | 025, 027 |
| 029 | Opus | Vendor availability UI -- availability tab in vendor edit Sheet + availability badge | 026, 028 |
| 030 | Sonnet | Notification service -- Resend email + Twilio SMS transport layer | -- |
| 031 | Sonnet | React Email templates -- schedule-confirmed, availability-prompt, reschedule-request | 030 |
| 032 | Sonnet | Scheduling API -- tenant-availability, suggest, confirm, reschedule routes | 025, 027, 030 |
| 033 | Sonnet | AI schedule matcher -- Claude prompt for slot suggestions, JSON parsing | 032 |
| 034 | Opus | Scheduling modal UI -- slot picker, AI suggestion card, date selector | 026, 032, 033 |
| 035 | Opus | Tenant availability prompt UI -- day-part grid, submission flow | 026, 032 |
| 036 | Opus | Schedule confirmation card + reschedule dialog UI | 026, 032 |
| 037 | Sonnet | Extend dispatch route -- create scheduling_tasks row + trigger tenant notification | 030, 032 |
| 038 | Sonnet | Public reschedule page -- token-based vendor reschedule endpoint + minimal UI | 032 |
| 039 | Sonnet | Integrate scheduling status into request detail pages (landlord + tenant) | 034, 035, 036 |
| 040 | Haiku | Unit tests -- scheduling API routes, notification service, AI matcher | 032, 033 |
| 041 | Haiku | Update endpoints.md with all new routes and pages | 039 |

**Tier breakdown**: 4 Haiku, 7 Sonnet, 4 Opus (15 tasks total, reflecting the significant UI work + notification integration)

**Dependency graph**:
```
025 (migration) ─┬─→ 027 (types) ──┬──→ 028 (vendor avail API) ──→ 029 (vendor avail UI)
                 │                  ├──→ 032 (scheduling API) ──┬──→ 033 (AI matcher) ──→ 034 (scheduling modal)
                 │                  │                           ├──→ 035 (tenant prompt)
026 (shadcn) ────┤                  │                           ├──→ 036 (confirmation card)
                 │                  │                           ├──→ 037 (dispatch extension)
030 (notifs) ────┼──→ 031 (templates)                          ├──→ 038 (public reschedule)
                 │                  │                           └──→ 040 (tests)
                 │                  └──→ 032 ←─── 030
                 │
                 └──→ all UI tasks (029, 034, 035, 036)

039 (integration) depends on 034 + 035 + 036
041 (docs) depends on 039
```

**Parallelism**: Tasks 025, 026, and 030 can all start immediately in parallel. Task 027 can start as soon as 025 completes. Tasks 028 and 032 can run in parallel once 027 is done. All four Opus UI tasks (029, 034, 035, 036) can run in parallel once their API dependencies are met.

## Open Questions

1. **Timezone handling** -- Vendors and tenants may be in different timezones (unlikely for small landlords with local vendors, but possible). Recommendation: Store all times in UTC. Display in the property's timezone (derived from the property address). Add a `timezone` column to `properties` table in the migration. For MVP, default to the landlord's browser timezone.

2. **How long should the tenant availability window be?** -- Currently planned as 7 days. For emergency requests, should this be shorter (24-48 hours)? Recommendation: 7 days for low/medium, 3 days for emergency, with a "respond by" deadline shown to the tenant.

3. **Should vendors get their own portal eventually?** -- This feature uses email/SMS-only communication with vendors. Phase 3 could add a vendor portal for availability self-management, job history, and invoicing. For now, email links + landlord-managed availability is sufficient.

4. **SMS costs at scale** -- Twilio charges per message. For a landlord with 20 units and frequent maintenance, SMS costs could add up. Recommendation: Make SMS opt-in per vendor and per tenant. Default to email-only. Add SMS toggle to vendor form and tenant preferences in a later phase.

5. **What if the vendor and tenant have zero overlapping availability?** -- The scheduling modal should show a clear message: "No overlapping times found." Options: (a) landlord manually enters a time and contacts both parties, (b) system suggests the closest near-miss and recommends expanding windows. Recommendation: Show the near-miss and let the landlord override.

6. **Notification service environment variables** -- Resend and Twilio require API keys. These need to be added to `.env.local`, `.env.example`, and Vercel environment variables. Should we gate the feature behind a "notifications configured" check? Recommendation: Yes. If notification env vars are missing, the scheduling flow still works but skips sending -- the landlord sees a warning "Notifications not configured. You will need to contact the vendor/tenant manually."

7. **Estimated repair duration** -- The scheduling modal needs to know how long to block off. Where does this come from? Recommendation: Use a default duration by category (plumbing: 2h, electrical: 2h, hvac: 3h, structural: 4h, pest: 1h, appliance: 1.5h, general: 2h). The landlord can adjust in the modal before confirming. Store the duration estimate in `scheduling_tasks`.
