---
id: 132
title: Build Rule Audit Card on Request Detail page
tier: Opus
depends_on: [126]
feature: P2-003-rule-based-automation
---

# 132 — Rule Audit Card on Request Detail Page

## Objective
Display rule execution audit information on the maintenance request detail page.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

When viewing a specific maintenance request, the landlord should see which rules were evaluated and what actions were taken. This information is displayed in a Rule Audit Card in the right column.

## Implementation

1. Create Rule Audit Card component (`apps/web/components/requests/RuleAuditCard.tsx`):
   - Rendered on request detail page (right column)
   - Fetches rule execution logs for this request: GET /api/rules/logs?request_id=<id>
   - Show loading state while fetching

2. Card Content:

   a) No Rules Matched State:
      - Message: "No automation rules matched this request"
      - "Edit rules" link (navigates to Settings > Automation Rules)

   b) Rules Matched State:
      - Title: "Automation Rules Applied"
      - For each matched rule (matched = true):
        - Rule name (as heading)
        - Rule ID (gray, small)
        - Action badges:
          - Green "Auto-Approved" badge if auto_approve action executed
          - Purple "Assigned to [Vendor Name]" badge if assign_vendor action executed
          - Blue "Escalated" badge if escalate action executed
          - Gray "Notified Landlord" badge if notify_landlord action executed
        - Optional: expand/collapse section to show conditions_result (JSON) and actions_executed (JSON) for debugging

   c) Footer:
      - "Edit rules" link to navigate to Settings > Automation Rules

3. Data Fetching:
   - Component receives request_id as prop
   - On mount: GET /api/rules/logs?request_id=<id>
   - Cache result (or refetch on re-open of detail page)

4. Styling:
   - Card container with subtle border/background
   - Match existing request detail page styling
   - Badges use Tailwind colors (green, purple, blue, gray)
   - Rule names bolded
   - "Edit rules" link styled as action link

5. UX Details:
   - Audit card appears above or below other metadata
   - Non-intrusive design (not blocking main request info)
   - If request is not auto-approved, show "No automation rules matched" — don't leave card blank
   - Clickable rule names expand to show condition/action details (optional enhancement)

6. Accessibility:
   - Semantic HTML (headings, sections)
   - ARIA labels on badges
   - Links are keyboard navigable

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] Rule Audit Card renders on request detail page
3. [ ] Card fetches rule execution logs from GET /api/rules/logs?request_id=<id>
4. [ ] Loading state shown while fetching
5. [ ] "No automation rules matched" message shown when no matched rules
6. [ ] "Edit rules" link visible in both empty and populated states
7. [ ] Matched rules displayed with rule name
8. [ ] Action badges shown for each executed action
9. [ ] Auto-Approved badge shown for auto_approve actions
10. [ ] Assigned to [Vendor] badge shown for assign_vendor actions
11. [ ] Escalated badge shown for escalate actions
12. [ ] Notified Landlord badge shown for notify_landlord actions
13. [ ] Badge colors consistent (green, purple, blue, gray)
14. [ ] Card styling matches request detail page aesthetic
15. [ ] "Edit rules" link navigates to Settings > Automation Rules
16. [ ] Responsive design (mobile-friendly)
17. [ ] Error handling: show error message if log fetch fails
18. [ ] Manual testing: view request with matched rules, verify audit info displayed
19. [ ] Manual testing: view request without matched rules, verify empty state
20. [ ] Verify rule names and actions are accurate (match execution log data)
