---
id: 131
title: Build Rule Test Panel UI — sample request form, results display
tier: Opus
depends_on: [123, 130]
feature: P2-003-rule-based-automation
---

# 131 — Rule Test Panel UI

## Objective
Build the Rule Test Panel for testing rules against sample data before saving them.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

The Test Panel is integrated into the Rule Builder (task 130). It allows landlords to test rule logic against sample maintenance requests without saving the rule.

## Implementation

1. Create Rule Test Panel component (`apps/web/components/rules/RuleTestPanel.tsx`):
   - Collapsible section within Rule Builder
   - Initially collapsed (not blocking the rule creation UI)
   - Expand button: "Test this rule"

2. Collapsed State:
   - Show: "Test Rule" header with chevron icon (collapsed state)
   - Click to expand

3. Expanded State:

   a) Sample Request Form Section:
      - Preset Buttons (quick test scenarios):
        - "Cheap plumbing" (category: plumbing, urgency: low, cost: 150)
        - "Expensive electrical" (category: electrical, urgency: medium, cost: 2500)
        - "Emergency HVAC" (category: hvac, urgency: emergency, cost: 1500)
        - Clicking preset auto-fills custom form fields below

      b) Custom Request Fields:
         - Category dropdown (plumbing, electrical, hvac, structural, pest, appliance, general)
         - Urgency dropdown (low, medium, emergency)
         - Estimated cost number input (default: 0)
         - Property multi-select (optional, defaults to all properties)
         - Add more fields as needed (condition types match form fields)

      c) Run Test Button:
         - "Run Test" button below fields
         - Disabled if rule form is invalid (catch error gracefully)
         - On click: POST /api/rules/[id]/test with custom request data
         - Show loading spinner during test

4. Results Display Section:
   - Appears after test runs (or if test succeeds)
   - Overall Result Badge:
     - If matched: "MATCHED ✓" (green badge)
     - If not matched: "NOT MATCHED ✗" (gray badge)
   - Conditions Breakdown:
     - Collapsible/expandable section
     - Each condition displayed with:
       - Condition description (e.g., "Category is plumbing")
       - Match icon: ✓ (green) if matched, ✗ (red) if not matched
       - Details text (e.g., "Checked: plumbing == plumbing")
     - All conditions visible if matched rule
   - Actions Preview:
     - Section titled "Actions that will execute:"
     - List of action descriptions:
       - "Auto-approve this request"
       - "Assign to Acme Plumbing"
       - "Send in-app notification to landlord"
       - "Escalate to emergency"
     - Empty message if no matched rules (not applicable)

5. Test State Management:
   - Component state:
     - `isTestOpen`: boolean (collapsed/expanded)
     - `testRequest`: sample request data
     - `testResult`: RuleTestResponse from API
     - `isLoading`: during test execution
     - `error`: error message if test fails
   - Reset test results when rule form changes (optional, or keep for quick re-test)

6. Error Handling:
   - If POST /api/rules/[id]/test fails:
     - Show error message: "Test failed: [error details]"
     - Provide "Try again" button
     - Don't block rule builder form

7. UX Details:
   - No delay between preset button click and form update
   - Test results persist until user modifies rule or clicks new preset
   - All conditions visible (not paginated)
   - Styling matches Rule Builder UI
   - Responsive on mobile

8. Integration with Rule Builder:
   - Rendered as collapsible section within Rule Builder component
   - Passes current rule data to Test Panel
   - Test endpoint uses rule id if rule is saved (edit mode), or sample rule object if creating
   - Warn user in create mode: "Note: This rule hasn't been saved yet, testing uses current form values"

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] Rule Test Panel renders as collapsible section in Rule Builder
3. [ ] Collapsed state shows "Test Rule" header with chevron
4. [ ] Expand/collapse toggle works smoothly
5. [ ] Preset buttons populate custom form fields
6. [ ] All 3 presets available: Cheap plumbing, Expensive electrical, Emergency HVAC
7. [ ] Custom request fields visible: category, urgency, cost, property
8. [ ] Run Test button enabled when form is valid
9. [ ] Run Test button disabled when rule form is invalid
10. [ ] POST /api/rules/[id]/test called with sample data
11. [ ] Results display shows matched/not matched badge
12. [ ] Conditions breakdown shows all conditions with check/X icons
13. [ ] Actions preview lists all actions that would execute
14. [ ] Actions preview empty if rule not matched
15. [ ] Error handling: show error message if test fails
16. [ ] Test results persist until rule form changes (optional behavior)
17. [ ] Loading spinner shown during test execution
18. [ ] Results section appears after test completes
19. [ ] Responsive design (mobile-friendly)
20. [ ] No JavaScript errors when testing unsaved rule
21. [ ] Manual testing: create rule, test with presets and custom data, verify results
22. [ ] Verify condition/action descriptions are clear and user-friendly
23. [ ] Accessibility: form labels, button labels, status announcements
