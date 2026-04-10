---
id: 111
title: Scheduling modal UI — slot picker, AI suggestion card, date selector
tier: Opus
depends_on: [103, 109, 110]
feature: P2-002-auto-scheduling-vendors
---

# 111 — Scheduling Modal UI — Slot Picker, AI Suggestion Card, Date Selector

## Objective
Build the landlord-facing scheduling modal with calendar date picker, time slot grid, and AI-suggested appointment slots with one-click confirmation.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create `apps/web/components/scheduling/SchedulingModal.tsx`:
   - Modal wrapper (Sheet or Dialog) triggered from "Schedule Now" button on dispatched request
   - Three main sections:

2. **Date Selector Section**:
   - shadcn Calendar component showing 14 days forward
   - Only selectable dates are those with available vendor/tenant overlap
   - Dates with no availability shown as disabled
   - On date selection, load available time slots for that date

3. **AI Suggestions Card**:
   - Call suggestSchedulingSlots() on modal open
   - Display top 3 suggested slots in a card
   - Each suggestion shows:
     - Date, time, score/confidence indicator
     - Reasoning: "Vendor available, tenant prefers morning"
     - "Select This Time" button
   - On click, auto-fill slot picker with suggested values

4. **Slot Picker Section**:
   - Show selected date prominently
   - Time slot grid showing:
     - Vendor availability (green)
     - Tenant availability (blue)
     - Overlap (darker green/blue)
     - Conflict (red/disabled)
   - Allow landlord to click available slot to select
   - Show selected slot highlighted
   - Display appointment duration estimate

5. **Actions**:
   - "Confirm & Notify" button (calls confirm API)
   - "Skip Scheduling" button (closes modal, request remains dispatched but unscheduled)
   - Cancel button (closes without saving)

6. **Loading & Error States**:
   - Show spinner while loading AI suggestions
   - Show error message if AI suggestion fails
   - Show error message if confirmation fails

7. **Responsive Design**:
   - Modal responsive on mobile (full-screen on small screens)
   - Touch-friendly time slot grid

## Acceptance Criteria
1. [ ] Modal opens when "Schedule Now" button clicked
2. [ ] Calendar renders 14-day view with disabled unavailable dates
3. [ ] Date selection loads available time slots
4. [ ] AI suggestions display with scores and reasoning
5. [ ] "Select This Time" button on suggestions auto-fills slot picker
6. [ ] Manual slot picker shows vendor/tenant/overlap availability
7. [ ] "Confirm & Notify" calls API and shows success
8. [ ] "Skip Scheduling" closes modal without error
9. [ ] Error states handled gracefully (show user-friendly messages)
10. [ ] Responsive design works on mobile
