---
id: 219
title: Build compliance dashboard UI — all-properties view + single-property detail
tier: Opus
depends_on: [210, 211, 212, 213]
feature: P3-003-legal-compliance-engine
---

# 219 — Compliance Dashboard UI

## Objective
Build the main compliance dashboard UI showing all properties with compliance scores and a detailed view for individual properties with checklist status, score breakdown, and recent alerts.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

The compliance dashboard is the entry point for landlords to monitor their legal compliance posture across all properties. It displays compliance scores, missing items, and alerts at a glance.

## Implementation

1. **Create dashboard page** — `apps/web/app/(landlord)/compliance/page.tsx`
   - Main compliance dashboard for all properties
   - No single property selected yet

2. **Dashboard layout**:
   - **Header section**:
     - Title: "Legal Compliance Dashboard"
     - Subtitle: "Monitor jurisdiction compliance for all properties"
     - DisclaimerBanner with "This is not legal advice"

   - **Summary stats card** (if multiple properties):
     - Average compliance score across all properties
     - Count of properties needing attention (score < 80%)
     - Count of open alerts (severity = error)
     - Count of properties with incomplete jurisdiction setup

   - **Property cards grid** (list/grid view toggle):
     - For each property:
       - Property name + address
       - Compliance score (0-100) with color coding:
         - Red: 0-40
         - Orange: 41-70
         - Yellow: 71-85
         - Green: 86-100
       - Progress bar showing score
       - Jurisdiction badge (state + city, or "Not configured")
       - Quick stats:
         - Checklist: "X of Y items completed"
         - Alerts: "X open alerts" (with severity color)
       - "View Details" button → property detail page
       - "Configure Jurisdiction" button (if not set)

   - **Filters & sorting**:
     - Filter by jurisdiction (state dropdown)
     - Sort by: score (asc/desc), name, recently updated

   - **Empty state**:
     - If no properties: "Create a property to get started"
     - Link to properties page

3. **Property detail page** — `apps/web/app/(landlord)/compliance/[propertyId]/page.tsx`
   - Header:
     - Property name + address
     - Jurisdiction badge (state + city)
     - Compliance score (large, with color)
     - Last updated timestamp

   - **Compliance score breakdown section**:
     - Large score circle: X/100
     - Checklist progress: "Y of Z items completed"
     - Breakdown by topic (optional):
       - Topic categories with status (e.g., "Notice Periods: 3/4 complete")

   - **Checklist section**:
     - Title: "Compliance Checklist"
     - List of all checklist items:
       - Checkbox + description + completion date (if completed)
       - Group by topic (accordion style)
       - Color-code incomplete items (red/orange)
     - "Mark all complete" button (with confirmation)

   - **Open alerts section**:
     - Title: "Active Alerts"
     - List alerts from GET /api/compliance/alerts/[propertyId]
     - Alert cards with severity color, title, description, suggested_action
     - "Dismiss" button (logs acknowledgment)

   - **Recent actions section**:
     - Title: "Compliance Activity"
     - Timeline of recent compliance actions (from audit log)
     - E.g., "Notice sent - 2 days ago", "Checklist item completed - 1 week ago"

   - **Sidebar** (optional):
     - "Configure Jurisdiction" button (if not set)
     - "Jurisdiction Rules" link → knowledge base (task 223)
     - "Generate Notice" button (if jurisdiction set) → notice generator (task 220)
     - "Review Message" button → communication reviewer (task 221)

4. **Design patterns**:
   - Use existing card, button, badge, progress components
   - Use accordion for grouping checklist by topic
   - Use DisclaimerBanner at top of detail page
   - Color coding: red (#ef4444), orange (#f97316), yellow (#eab308), green (#22c55e)
   - Responsive: stack on mobile, grid on desktop

5. **Loading & error states**:
   - Show skeleton loader while fetching compliance data
   - Error state if property not found or unauthorized
   - Handle case where jurisdiction not configured

6. **Interactions**:
   - Clicking property card navigates to detail page
   - Checking checklist item calls PATCH /api/compliance/[propertyId]/checklist/[itemId]
   - Dismissing alert marks as acknowledged
   - Compliance score automatically updates after checklist change

7. **Update endpoints.md**
   - Document new pages under "App Pages / Compliance"

## Acceptance Criteria
1. [ ] Dashboard page created at /app/(landlord)/compliance
2. [ ] Displays all properties with compliance scores and color coding
3. [ ] Property cards show jurisdiction, checklist progress, and alert count
4. [ ] Filter by jurisdiction and sort options work
5. [ ] Detail page created at /app/(landlord)/compliance/[propertyId]
6. [ ] Detail page shows compliance score breakdown and checklist items
7. [ ] Checklist items can be marked complete/incomplete
8. [ ] Alerts section displays findings from GET /api/compliance/alerts
9. [ ] Audit log section shows recent compliance actions
10. [ ] DisclaimerBanner displayed on both pages
11. [ ] Jurisdiction not configured state handled gracefully
12. [ ] Responsive design works on mobile and desktop
13. [ ] Loading and error states implemented
14. [ ] endpoints.md updated
