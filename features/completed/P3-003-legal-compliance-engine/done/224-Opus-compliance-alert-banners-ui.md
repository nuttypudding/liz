---
id: 224
title: Build compliance alert banners — integrate into existing pages
tier: Opus
depends_on: [210, 218]
feature: P3-003-legal-compliance-engine
---

# 224 — Compliance Alert Banners UI

## Objective
Build reusable alert banner components that display compliance warnings and errors. Integrate alert banners into dashboard, property detail pages, and maintenance request pages to surface critical compliance issues at relevant times.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Alert banners make compliance issues visible where landlords are taking action. Surfacing alerts at the point of decision prevents compliance mistakes.

## Implementation

1. **Create ComplianceAlertBanner component** — `apps/web/components/compliance/ComplianceAlertBanner.tsx`
   - Props:
     - `alert: Alert` (from GET /api/compliance/alerts response)
     - `propertyId: uuid` (for context)
     - `dismissible: boolean` (default true)
     - `onDismiss: () => void` (callback when dismissed)
     - `compact: boolean` (optional, show compact version)
   - Displays a single alert with severity, title, description, suggested_action

2. **Alert banner styling**:
   - **Error severity**:
     - Background: Red (#fee2e2)
     - Border-left: Red (#ef4444), 4px
     - Text: Dark red (#7f1d1d)
     - Icon: Exclamation circle icon (red)
   - **Warning severity**:
     - Background: Orange (#fef3c7)
     - Border-left: Orange (#f97316), 4px
     - Text: Dark orange (#92400e)
     - Icon: Warning triangle icon (orange)
   - **Info severity** (optional):
     - Background: Blue (#eff6ff)
     - Border-left: Blue (#3b82f6), 4px
     - Text: Dark blue (#1e3a8a)
     - Icon: Info circle icon (blue)

3. **Alert banner layout**:
   - **Compact version**:
     - Single line: [Icon] [Title] [Suggested action]
     - Close button (X) on right
   - **Full version**:
     - Row 1: [Icon] [Title] [Close button]
     - Row 2: [Description] (indented)
     - Row 3: [Suggested action] (indented, green text/link)
     - Row 4: [Jurisdiction reference] if relevant (small gray text, statute citation)

4. **Interactive elements**:
   - **Dismiss button (X)**:
     - Clicking dismisses banner
     - Logs acknowledgment to compliance_audit_log (optional)
     - Callback to onDismiss prop
   - **Suggested action**:
     - Can be text or clickable link
     - E.g., "Schedule entry notice" (link to notice generator)
     - E.g., "Update lease terms" (link to settings)

5. **ComplianceAlertsBanner component** — `apps/web/components/compliance/ComplianceAlertsBanner.tsx`
   - Wrapper component that shows multiple alerts
   - Props:
     - `propertyId: uuid`
     - `alerts: Alert[]` (array of alerts)
     - `maxVisible: number` (default 3, e.g., "Show 3 most severe alerts")
     - `onDismissAll: () => void` (optional)
   - Shows alerts sorted by severity (error first, then warning)
   - "Show X more alerts" link if alerts > maxVisible (links to compliance dashboard)
   - Stacks alerts vertically

6. **Integration points** — where to use ComplianceAlertsBanner:

   **Dashboard page** — `app/(landlord)/dashboard/page.tsx`:
   - Add alerts section at top of dashboard
   - Show 3 most severe alerts across all properties
   - Link to full compliance dashboard if more alerts

   **Property detail page** — `app/(landlord)/properties/[id]/page.tsx`:
   - Show property-specific alerts at top
   - Show all alerts for that property
   - Alert for: rent increase, entry notice, maintenance issues, etc.

   **Compliance detail page** — `app/(landlord)/compliance/[propertyId]/page.tsx`:
   - Already has alerts section (task 219)
   - Use ComplianceAlertsBanner here

   **Maintenance request detail** — `app/(landlord)/requests/[id]/page.tsx`:
   - Show habitability-related alerts when viewing request
   - E.g., "This issue is a habitability issue. You have 3 days to respond."
   - Show entry notice alert if scheduling vendor visit

   **Rent/lease edit pages** — If user is updating rent or lease terms:
   - Show alerts about upcoming deadlines
   - E.g., "Rent increase requires 90 days notice. Current increase takes effect in 45 days."

7. **Data flow**:
   - Page loads
   - Fetch alerts from GET /api/compliance/alerts/[propertyId]
   - Pass alerts to ComplianceAlertsBanner
   - Component renders alert banners
   - User dismisses banner → calls onDismiss callback
   - Optional: Log dismissal to compliance_audit_log (action_type: "alert_acknowledged")

8. **Styling consistency**:
   - Use existing utility classes (text-red-900, bg-red-50, border-red-400, etc.)
   - Use existing icon library (lucide-react icons: AlertCircle, AlertTriangle, Info)
   - Use existing card, button, badge components as base

9. **Storybook stories** — `apps/web/components/compliance/ComplianceAlertBanner.stories.tsx`
   - Show error severity alert (compact and full)
   - Show warning severity alert (compact and full)
   - Show with/without dismiss button
   - Show with suggested action link
   - Show multiple alerts stacked

10. **Responsive design**:
    - Full layout on desktop
    - Compact layout on mobile (stack vertically, keep one-line per alert if possible)
    - Close button always visible and easy to tap on mobile

11. **Update endpoints.md**
    - Document integration points where alerts are displayed

## Acceptance Criteria
1. [ ] ComplianceAlertBanner component created with props for alert, dismissible, compact
2. [ ] Styling: error (red), warning (orange), info (blue) backgrounds and borders
3. [ ] Compact and full layout variants
4. [ ] Close/dismiss button functional
5. [ ] ComplianceAlertsBanner wrapper for multiple alerts created
6. [ ] Alerts sorted by severity (error first)
7. [ ] "Show X more" link when alerts > maxVisible
8. [ ] Integrated into dashboard page (top, 3 most severe)
9. [ ] Integrated into property detail page
10. [ ] Integrated into compliance detail page (already in task 219)
11. [ ] Integrated into maintenance request page (if applicable)
12. [ ] Storybook stories created for both components
13. [ ] Responsive design for mobile, tablet, desktop
14. [ ] Uses existing icon/button/card components
15. [ ] No TypeScript errors
16. [ ] endpoints.md updated with integration points
