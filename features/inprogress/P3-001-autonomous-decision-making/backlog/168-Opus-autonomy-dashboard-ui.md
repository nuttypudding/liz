---
id: 168
title: Build Autonomy Dashboard UI — /autopilot with status banner, summary strip, decision feed
tier: Opus
depends_on: [163, 167]
feature: P3-001-autonomous-decision-making
---

# 168 — Autonomy Dashboard UI

## Objective
Build the main autonomy dashboard at `/autopilot` showing autonomy status, quick metrics, and a paginated feed of autonomous decisions.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

The dashboard is the landlord's hub for autonomy. It shows whether autonomy is active/paused, quick metrics (decisions today, spend, escalations), and a detailed feed of decisions they can review and override.

## Implementation

1. Create page file: `apps/web/app/(landlord)/autopilot/page.tsx`
2. Build layout with three sections:
   - **Status banner** (top):
     - "Autonomy is ACTIVE" or "PAUSED" with large visual indicator (green/gray)
     - Toggle button to pause/unpause (calls PUT /api/autonomy/settings)
     - Quick link to settings ("Configure autopilot")
   - **Summary strip** (below banner):
     - Card grid showing:
       - "Decisions today": count of decisions created in last 24h
       - "Total spend (this month)": sum from autonomy_monthly_stats
       - "Escalations": count of decisions with decision_type='escalate'
       - "Pending review": count with status='pending_review'
     - All cards pull from GET /api/autonomy/decisions and GET /api/autonomy/stats
   - **Decision feed** (main):
     - Paginated list of autonomous decisions (use GET /api/autonomy/decisions)
     - Each card shows:
       - Request summary (category, urgency, tenant, description)
       - Decision: "Auto-dispatched" or "Escalated for review"
       - Confidence score (circular progress indicator, 0-1)
       - AI reasoning (2-3 bullets)
       - Actions taken (vendor, estimated cost, status)
       - Landlord actions: Confirm (if pending_review) or Override (with free-text reason dialog)
     - Expandable details section showing safety checks
     - Status badges: "pending_review", "confirmed", "overridden"
3. Wire fetching:
   - Use React Server Components or useEffect + useState for client-side fetching
   - Paginate decisions (load 20 per page, infinite scroll or pagination controls)
   - Filter buttons: "All", "Pending Review", "Confirmed", "Overridden"
4. Wire confirm/override:
   - Confirm: PATCH /api/autonomy/decisions/[id] with review_action='confirmed'
   - Override: show dialog, collect reason, PATCH with review_action='overridden' + review_notes
5. Styling:
   - Use shadcn components: Card, Badge, Button, Dialog, ToggleGroup
   - Responsive grid layout
   - Status indicators with colors (green for auto-dispatch, yellow for escalate, red for override)
6. Error handling:
   - Show toast on API errors
   - Retry button for failed requests
7. Loading states:
   - Skeleton cards while fetching
   - Disable buttons during mutation

## Acceptance Criteria
1. [ ] Page created at apps/web/app/(landlord)/autopilot/page.tsx
2. [ ] Status banner shows active/paused with visual indicator
3. [ ] Toggle pause/unpause works (calls settings API)
4. [ ] Summary cards display accurate counts
5. [ ] Decision feed paginated (20 per page)
6. [ ] Each decision card shows all required info
7. [ ] Confidence score displayed with circular indicator
8. [ ] Reasoning bullets rendered clearly
9. [ ] Confirm button works (PATCH with confirmed)
10. [ ] Override button shows dialog with reason field
11. [ ] Override reason saved in review_notes
12. [ ] Status badges updated after action
13. [ ] Filter buttons work (pending, confirmed, overridden)
14. [ ] Loading skeletons shown during fetch
15. [ ] Error toast shown on API failure
16. [ ] Responsive on mobile
