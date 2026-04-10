---
id: 173
title: Sidebar navigation — add "Autopilot" link with pending-review badge
tier: Sonnet
depends_on: [168]
feature: P3-001-autonomous-decision-making
---

# 173 — Sidebar Navigation — Autopilot Link

## Objective
Add "Autopilot" navigation link to the landlord sidebar, with a badge showing pending-review decision count.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

The sidebar is the main navigation for landlords. Adding an "Autopilot" link makes autonomy easily discoverable. The badge alerts landlords to decisions awaiting their review.

## Implementation

1. Locate sidebar component:
   - Likely in `apps/web/components/layout/...` or `apps/web/app/(landlord)/layout.tsx`
   - Search for existing nav links (Requests, Settings, etc.)
2. Add new nav item for "Autopilot":
   - Icon: Brain icon (or similar from lucide-react or heroicons)
   - Label: "Autopilot"
   - Link: `/autopilot` (href)
   - Before or after "Requests" (logical placement)
3. Add badge component:
   - Badge shows count of decisions with status='pending_review'
   - Fetch count via GET /api/autonomy/decisions?status=pending_review&limit=0 (to get total count only)
   - Only show badge if count > 0
   - Badge color: red or urgent (to draw attention)
   - Badge text: count (e.g., "3" for 3 pending decisions)
4. Implement badge update:
   - On page load, fetch pending count
   - Optionally, refetch every 30 seconds (or on focus) to keep count updated
   - Use SWR or React Query for caching and background refetching
5. Styling:
   - Match existing sidebar nav item styling
   - Badge positioned on top-right of link
   - Responsive on mobile
6. Test:
   - Navigate to sidebar
   - Verify Autopilot link appears
   - Verify badge shows when pending decisions exist
   - Verify badge disappears when count reaches 0
   - Verify link navigates to /autopilot page

## Acceptance Criteria
1. [ ] Autopilot link added to sidebar
2. [ ] Brain icon or appropriate icon shown
3. [ ] Link href points to /autopilot
4. [ ] Badge component shows pending count
5. [ ] Badge fetches count via API
6. [ ] Badge only shown when count > 0
7. [ ] Badge updates on page refocus (optional but nice)
8. [ ] Badge color is urgent/attention-grabbing
9. [ ] Link styling matches other nav items
10. [ ] Responsive on mobile
11. [ ] No TypeScript errors
