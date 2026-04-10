---
id: 171
title: Build Monthly Report UI — /autopilot/report with charts and metrics
tier: Opus
depends_on: [166, 167]
feature: P3-001-autonomous-decision-making
---

# 171 — Monthly Report UI

## Objective
Build a detailed monthly autonomy performance report page at `/autopilot/report` with charts, metrics, and AI-generated insights.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

The monthly report gives landlords visibility into autonomy performance: how many decisions were made, how many were auto-dispatched vs escalated, spend patterns, override rate, and a trust score. Charts visualize trends.

## Implementation

1. Create page file: `apps/web/app/(landlord)/autopilot/report/page.tsx`
2. Add month selector:
   - Dropdown or date picker: select month (YYYY-MM format)
   - Previous/Next month navigation buttons
   - Default to current month
   - Refetch on month change
3. Build layout with cards and charts:
   - **Summary cards** (top, 4-column grid):
     - "Total Decisions": count
     - "Auto-dispatched": count + percentage
     - "Escalated": count + percentage
     - "Monthly Spend": dollar amount
   - **Key metrics**:
     - "Override Rate": percentage of overridden decisions
     - "Trust Score": 0-1 displayed as percentage with color (green >= 0.8, yellow 0.6-0.8, red < 0.6)
     - "Avg. Confidence": average confidence score of all decisions
   - **Charts** (side-by-side):
     - **Spend by category** (pie chart or bar chart): break down total_spend by maintenance category
     - **Decisions by category** (bar chart): count of decisions by category
     - **Confidence distribution** (histogram or bar chart): bucket decisions by confidence ranges:
       - 0-0.5 (low)
       - 0.5-0.7 (medium-low)
       - 0.7-0.85 (medium-high)
       - 0.85-1.0 (high)
   - **AI Recommendation** (text panel):
     - Prompt Claude API with monthly stats to generate 2-3 sentence recommendation
     - Example: "Your trust score is excellent. Consider increasing confidence threshold to 0.90 for more autonomous decisions."
     - Cache recommendation for the month (don't regenerate on every page load)
4. Wire fetching:
   - GET /api/autonomy/stats?month=2024-04 to fetch stats
   - If recommendation not cached, call Claude API with stats context
   - Fetch recent decisions (limit 10) to compute confidence distribution and spend by category
5. Chart libraries:
   - Use shadcn chart component (recharts wrapper) for consistency
   - Pie chart for spend by category
   - Bar charts for decisions and confidence distribution
6. Data transformation:
   - Transform monthly_stats into summary cards
   - Compute percentages for auto-dispatch and escalated
   - Calculate confidence distribution from recent decisions
   - Group decisions by category
7. Styling:
   - Use shadcn: Card, Badge, Progress
   - Grid layout for summary cards
   - Responsive chart grid (stack on mobile)
   - Color-coded trust score indicator
8. Error handling:
   - Show error card if API fails
   - Retry button for failed requests
   - Gracefully handle missing stats (show placeholder)

## Acceptance Criteria
1. [ ] Page created at apps/web/app/(landlord)/autopilot/report/page.tsx
2. [ ] Month selector works (previous/next buttons)
3. [ ] Summary cards display accurate counts
4. [ ] Auto-dispatch percentage calculated correctly
5. [ ] Escalated percentage calculated correctly
6. [ ] Monthly spend total displayed
7. [ ] Override rate calculated (overridden / total)
8. [ ] Trust score displayed with color coding
9. [ ] Avg. confidence calculated from recent decisions
10. [ ] Spend by category chart renders (pie or bar)
11. [ ] Decisions by category chart renders (bar)
12. [ ] Confidence distribution histogram renders correctly
13. [ ] AI recommendation generated from stats
14. [ ] Recommendation text clear and actionable
15. [ ] Charts responsive on mobile
16. [ ] Error toast shown on fetch failure
17. [ ] Retry button works on error
