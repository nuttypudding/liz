---
id: 225
title: Integrate compliance into dashboard — summary card + property badges
tier: Sonnet
depends_on: [212, 219]
feature: P3-003-legal-compliance-engine
---

# 225 — Integrate Compliance into Dashboard

## Objective
Add compliance summary to the main landlord dashboard. Display a ComplianceSummaryCard showing average compliance score and properties needing attention. Add compliance score badges to existing property cards/list.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

The compliance module must integrate seamlessly into the existing dashboard. Landlords should see compliance status at a glance alongside other property metrics.

## Implementation

1. **Create ComplianceSummaryCard component** — `apps/web/components/compliance/ComplianceSummaryCard.tsx`
   - Props: `landlordId: uuid` (optional, defaults to current user)
   - Fetches compliance stats from API:
     - GET /api/compliance/stats (or calculate from /api/compliance/[propertyId]/score calls)
   - Displays:
     - Title: "Legal Compliance"
     - Metric 1: Average compliance score across all properties (large number + color)
       - Green: 80+
       - Yellow: 50-79
       - Orange: 25-49
       - Red: 0-24
     - Metric 2: "X properties needing attention" (properties with score < 80%)
     - Metric 3: "X open critical alerts" (severity = error)
     - Action button: "View Compliance Dashboard"
     - Mini chart (optional): Sparkline or progress bar showing score trend

2. **Add to dashboard page** — `apps/web/app/(landlord)/dashboard/page.tsx`
   - Insert ComplianceSummaryCard in appropriate section
   - Location: After property summary, before maintenance requests
   - Or: Create new row with compliance card + other summary cards
   - Responsive: Full width on mobile, grid cell on desktop

3. **Add ComplianceScoreBadge component** — `apps/web/components/compliance/ComplianceScoreBadge.tsx`
   - Props: `score: number`, `compact: boolean` (optional)
   - Displays: Score as small badge with color
     - Green (≥80): "Compliant" or "Good"
     - Yellow (50-79): "Needs Attention" or "Fair"
     - Orange (25-49): "At Risk" or "Poor"
     - Red (<25): "Critical" or "Alert"
   - Compact version: Just score number + colored circle
   - Full version: Score + label + small icon

4. **Integrate badge into property cards/list** — Existing property listings:
   - File: `apps/web/components/property/PropertyCard.tsx` or `PropertyListItem.tsx`
   - Add ComplianceScoreBadge to card/list item
   - Location: Top-right corner of card, or next to property name
   - Only show if property has jurisdiction configured
   - Click badge → navigate to property compliance detail page

5. **API endpoint** (optional, for efficiency):
   - GET /api/compliance/stats — Returns aggregated stats:
     ```json
     {
       "average_score": 75,
       "properties_needing_attention": 2,
       "critical_alerts_count": 1,
       "total_properties": 5,
       "score_distribution": {
         "excellent": 2,
         "good": 1,
         "fair": 1,
         "poor": 1,
         "critical": 0
       }
     }
     ```
   - Alternative: Calculate from multiple GET /api/compliance/[propertyId]/score calls

6. **Loading and error states**:
   - Show skeleton loader for ComplianceSummaryCard while fetching
   - If no properties: Show "No properties to assess"
   - If no jurisdictions configured: Show "Configure jurisdictions to enable compliance checking"
   - If error: Show error message + retry button

7. **Data refresh**:
   - Fetch compliance data on page load
   - Optional: Refetch periodically (every 5 minutes)
   - Refetch after user actions (jurisdiction change, checklist update)

8. **Design consistency**:
   - Use existing card, badge, button components
   - Match dashboard color scheme
   - Use DisclaimerBanner as needed

9. **Responsive design**:
   - ComplianceSummaryCard: Full width on mobile, grid cell on desktop
   - ComplianceScoreBadge: Scale appropriately in property cards
   - Mobile-friendly typography and spacing

10. **Update endpoints.md**
    - Document GET /api/compliance/stats (if created)
    - Document new components and integration points

## Acceptance Criteria
1. [ ] ComplianceSummaryCard component created
2. [ ] Displays average compliance score with color coding
3. [ ] Shows count of properties needing attention (score < 80%)
4. [ ] Shows count of critical alerts
5. [ ] "View Compliance Dashboard" button links to /compliance
6. [ ] Integrated into main dashboard page
7. [ ] ComplianceScoreBadge component created
8. [ ] Badge shows score with color (green/yellow/orange/red)
9. [ ] Compact and full variants exist
10. [ ] Badge added to existing property cards/lists
11. [ ] Clicking badge navigates to property compliance detail
12. [ ] Loading and error states implemented
13. [ ] Responsive design for mobile and desktop
14. [ ] No TypeScript errors
15. [ ] endpoints.md updated
