---
id: 133
title: Build Rules Summary Card on Dashboard
tier: Opus
depends_on: [127]
feature: P2-003-rule-based-automation
---

# 133 — Rules Summary Card on Dashboard

## Objective
Display rule activity summary on the dashboard with metrics and link to manage rules.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

The dashboard shows high-level metrics about rule activity. A summary card displays active rule count, auto-approved requests this month, and total processed requests.

## Implementation

1. Create Rules Summary Card component (`apps/web/components/dashboard/RulesSummaryCard.tsx`):
   - Rendered on dashboard (grid layout with other cards)
   - Fetches summary data: GET /api/rules/summary
   - Show loading state while fetching

2. Card Content:

   a) Empty State (no rules):
      - Heading: "Automation Rules"
      - Message: "No automation rules created yet"
      - Subtext: "Create rules to automatically approve and manage maintenance requests"
      - "Create your first rule" button (navigates to Settings > Automation Rules)
      - Optional: info icon with tooltip explaining rules feature

   b) Populated State (rules exist):
      - Heading: "Automation Rules"
      - Three metric rows:
        1. Active Rules
           - Large number display (e.g., "5")
           - Label: "Active Rules"
           - Subtext: "(N out of 25 rules)"
        2. Auto-Approved This Month
           - Large number display (e.g., "12")
           - Label: "Auto-Approved This Month"
           - Small icon (checkmark or similar)
        3. Total Processed This Month
           - Large number display (e.g., "47")
           - Label: "Requests Processed This Month"
           - Subtext: "(By any rule)"
      - Footer link: "Manage rules" (navigates to Settings > Automation Rules)

3. Visual Design:
   - Card container with border/shadow (matches other dashboard cards)
   - Color coding:
     - Active rules: blue accent
     - Auto-approved: green accent
     - Total processed: gray/neutral
   - Large number typography (bold, prominent)
   - Responsive layout: adapt to mobile (stack vertically or reduce columns)

4. Data Fetching:
   - On mount: GET /api/rules/summary
   - Refetch on: manual refresh, page reload, settings tab return
   - Cache result for 5–10 minutes (optional)

5. UX Details:
   - Empty state prominent and actionable (button)
   - Metrics easy to scan (large numbers)
   - "Manage rules" link always visible for easy navigation
   - No pagination or overflow (all metrics fit in card)
   - Tooltip on 25-rule limit indicator explaining why there's a limit

6. Accessibility:
   - Semantic HTML (headings, sections)
   - ARIA labels on metric numbers
   - Links are keyboard navigable
   - Color not the only indicator of meaning (include labels)

7. Integration:
   - Placed on dashboard grid alongside other cards
   - Consistent styling with existing dashboard cards
   - Loading skeleton matches dashboard style

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] Rules Summary Card renders on dashboard
3. [ ] Card fetches summary data from GET /api/rules/summary
4. [ ] Loading state shown while fetching
5. [ ] Empty state shown when no rules exist
6. [ ] Empty state has "Create your first rule" button
7. [ ] "Create your first rule" button navigates to Settings
8. [ ] Populated state shows heading "Automation Rules"
9. [ ] Active rules metric displays count and limit (N/25)
10. [ ] Auto-approved this month metric displays correctly
11. [ ] Total processed this month metric displays correctly
12. [ ] All three metrics visible without scrolling
13. [ ] "Manage rules" link visible in populated state
14. [ ] "Manage rules" link navigates to Settings > Automation Rules
15. [ ] Styling consistent with other dashboard cards
16. [ ] Color coding applied: blue, green, gray
17. [ ] Responsive design (mobile-friendly)
18. [ ] Error handling: show error message if fetch fails
19. [ ] Manual testing: navigate to dashboard, verify rules summary card loads
20. [ ] Manual testing: with/without rules, verify both states display correctly
21. [ ] Verify metrics are accurate (match /api/rules/summary response)
22. [ ] Performance: card loads quickly (< 500ms)
