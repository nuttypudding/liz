---
id: 112
title: Tenant availability prompt UI — day-part grid, submission flow
tier: Opus
depends_on: [103, 109]
feature: P2-002-auto-scheduling-vendors
---

# 112 — Tenant Availability Prompt UI — Day-Part Grid, Submission Flow

## Objective
Build the tenant-facing availability submission interface with a day-part grid (morning/afternoon/evening for next 7 days) and a simple, clear submission flow.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create `apps/web/app/scheduling/availability-prompt/[taskId]/page.tsx`:
   - Page component for public tenant availability submission
   - Fetch scheduling_task and request details
   - Render context about what repair is needed and property address

2. Create `apps/web/components/scheduling/TenantAvailabilityPrompt.tsx`:
   - Component that renders the availability submission form
   - Display work order details: "What: [category]", "Where: [property address]"
   - Display "When: Please confirm your availability in the next [N] days"

3. **Day-Part Grid**:
   - Show next 7 days (starting from today + 1)
   - Columns: Date (e.g., "Mon, Apr 12"), Morning (6am-12pm), Afternoon (12pm-6pm), Evening (6pm-10pm)
   - Each cell is a checkbox/toggle
   - Tenant can select any combination
   - Visual feedback: selected cells highlighted
   - Show day of week name for accessibility

4. **Submission Flow**:
   - "Confirm Availability" button at bottom
   - Validation: at least one time slot must be selected
   - Show error if no slots selected
   - On submit, POST to /api/scheduling/tenant-availability with selected slots
   - Show loading state during submission
   - On success:
     - Show confirmation message: "Thank you! We'll find the best time for your repair."
     - Option to close page
     - Optional: redirect to request detail page
   - On error, show error message and allow retry

5. **Mobile-Friendly Design**:
   - Responsive grid (stack on mobile)
   - Touch-friendly cell sizes
   - Clear typography

6. **Accessibility**:
   - Semantic HTML (form, fieldset, legend)
   - ARIA labels for day-parts
   - Keyboard navigation support

## Acceptance Criteria
1. [ ] Page loads with work order context displayed
2. [ ] Day-part grid renders 7 days with 3 columns (morning/afternoon/evening)
3. [ ] Cells are toggleable (checkbox/toggle)
4. [ ] At least one selection required validation works
5. [ ] POST to /api/scheduling/tenant-availability on submit
6. [ ] Success message shown after submission
7. [ ] Error message shown on API failure
8. [ ] Mobile-responsive layout
9. [ ] Keyboard navigation functional
