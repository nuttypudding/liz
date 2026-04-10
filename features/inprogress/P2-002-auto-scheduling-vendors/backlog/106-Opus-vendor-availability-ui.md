---
id: 106
title: Vendor availability UI — availability tab in vendor edit Sheet + availability badge
tier: Opus
depends_on: [103, 105]
feature: P2-002-auto-scheduling-vendors
---

# 106 — Vendor Availability UI — Availability Tab in Vendor Edit Sheet + Availability Badge

## Objective
Build the UI for landlords to set and view vendor recurring availability windows, and display availability status on vendor cards.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create new component `apps/web/components/vendors/AvailabilityTab.tsx`:
   - Displays weekly grid (7 days, Monday-Sunday)
   - For each day, show:
     - Toggle group with three options: "Not Available", "Custom Hours", "Always Available"
     - Conditional time range inputs (start_time, end_time) when "Custom Hours" selected
     - Timezone selector (default to landlord timezone)
   - Load existing rules from `GET /api/vendors/[id]/availability`
   - On save, POST to `PUT /api/vendors/[id]/availability`
   - Show loading and success states
   - Handle validation errors gracefully

2. Integrate into existing vendor edit Sheet:
   - Add "Availability" tab alongside existing tabs (Basic Info, Address, etc.)
   - Import and render AvailabilityTab component

3. Create `apps/web/components/vendors/AvailabilityBadge.tsx`:
   - Shows availability status indicator
   - Green: availability configured for most days
   - Gray: availability not configured
   - On vendor cards, show badge in top-right corner
   - Optional tooltip: "X% of week available" or "Not configured"

4. Update vendor card component to include AvailabilityBadge

5. Use shadcn calendar, popover, and toggle-group components

## Acceptance Criteria
1. [ ] AvailabilityTab renders with 7-day weekly grid
2. [ ] Toggle groups allow selection of availability mode per day
3. [ ] Time inputs appear/hide based on "Custom Hours" selection
4. [ ] Timezone selector available and functional
5. [ ] Save button calls PUT API and shows success message
6. [ ] Existing availability loads on component mount
7. [ ] AvailabilityBadge displays on vendor cards
8. [ ] Badge color reflects configuration status
9. [ ] Validation errors displayed to user
