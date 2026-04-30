---
id: 130
title: Build Rule Builder UI — sheet/dialog, conditions, actions
tier: Opus
depends_on: [121, 123, 128]
feature: P2-003-rule-based-automation
---

# 130 — Rule Builder UI

## Objective
Build the Rule Builder interface for creating and editing automation rules with dynamic condition and action rows.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

Landlords build rules using a visual rule builder. The interface has sections for rule metadata (name), conditions (IF), and actions (THEN) with dynamic rows for each.

## Implementation

1. Create Rule Builder component (`apps/web/components/rules/RuleBuilder.tsx`):
   - Used by Rules Manager (task 129) to create and edit rules
   - Renders as Sheet on desktop (right sidebar), Dialog on mobile
   - Modal wrapper handles responsive layout

2. Rule Metadata Section:
   - Rule name input (required, 1–255 characters)
   - Description textarea (optional, 0–1000 characters)
   - Display validation errors below fields

3. Conditions Section (IF):
   - Title: "IF all of the following match:"
   - Dynamic row rendering:
     - Each row is one RuleCondition
     - Row controls:
       - Condition type dropdown (category, urgency, cost_range, property_selector, vendor_available)
       - Operator dropdown (equals, in, range, matches — varies by type)
       - Value input field(s) — type varies:
         - `category`: dropdown (plumbing, electrical, hvac, structural, pest, appliance, general)
         - `urgency`: dropdown (low, medium, emergency)
         - `cost_range`: two number inputs (min, max)
         - `property_selector`: multi-select of properties (or "all properties" option)
         - `vendor_available`: multi-select of vendors
       - Remove button (delete row)
   - Add Condition button (adds new empty row)
   - Validation: at least 1 condition required
   - Display error "At least one condition required" if empty

4. Actions Section (THEN):
   - Title: "THEN perform these actions:"
   - Dynamic row rendering:
     - Each row is one RuleAction
     - Row controls:
       - Action type dropdown (auto_approve, assign_vendor, notify_landlord, escalate)
       - Parameters input — varies by action type:
         - `auto_approve`: no parameters (toggle confirmation)
         - `assign_vendor`: dropdown to select vendor
         - `notify_landlord`: checkboxes for method (in_app, email, sms)
         - `escalate`: no parameters (toggle confirmation)
       - Remove button (delete row)
   - Add Action button (adds new empty row)
   - Validation: at least 1 action required
   - Display error "At least one action required" if empty

5. Form Validation:
   - Real-time validation as user types
   - Show validation errors inline (below each field)
   - Disable Save button if validation fails
   - Highlight invalid sections (red border on section)

6. Save/Cancel Buttons:
   - Bottom of sheet/dialog
   - Cancel button: closes without saving (confirm if dirty)
   - Save button:
     - Disabled if validation fails
     - On click: POST /api/rules (create) or PUT /api/rules/[id] (edit)
     - Show loading state during request
     - On success: close sheet, show toast "Rule saved"
     - On error: show error toast with details, keep sheet open

7. Edit Mode:
   - Prefill form with existing rule data
   - Fetch rule by id if route param provided
   - Display loading state while fetching
   - Title: "Edit Rule" vs "Create Rule"

8. Test Panel Integration:
   - Task 131: Collapsible Test Panel section at bottom
   - Always visible in Rule Builder for testing before save

9. Styling:
   - Use Tailwind CSS + shadcn components (Input, Select, Button, Sheet/Dialog)
   - Consistent with existing Liz design
   - Clear visual hierarchy (sections, labels, inputs)
   - Responsive layout (desktop Sheet, mobile Dialog)

10. Data Binding:
    - React state for form data:
      - `name`, `description`, `conditions[]`, `actions[]`
    - React Hook Form or similar for validation (optional, simple state is fine)
    - Zod schemas (task 120) for validation on submit

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] Rule Builder renders as Sheet on desktop, Dialog on mobile
3. [ ] Create mode: empty form with defaults
4. [ ] Edit mode: form prefilled with existing rule data
5. [ ] Rule name input (required, 1–255 characters)
6. [ ] Description textarea (optional, 0–1000 characters)
7. [ ] Conditions section renders dynamic rows
8. [ ] Add Condition button adds new row
9. [ ] Remove Condition button deletes row
10. [ ] Condition type dropdown shows all types (category, urgency, cost_range, property_selector, vendor_available)
11. [ ] Condition value inputs vary by type (dropdown, input, multi-select)
12. [ ] Actions section renders dynamic rows
13. [ ] Add Action button adds new row
14. [ ] Remove Action button deletes row
15. [ ] Action type dropdown shows all types
16. [ ] Action parameters vary by type
17. [ ] Validation: at least 1 condition required
18. [ ] Validation: at least 1 action required
19. [ ] Validation: rule name required
20. [ ] Save button disabled if validation fails
21. [ ] POST /api/rules called on create
22. [ ] PUT /api/rules/[id] called on edit
23. [ ] Success toast shown on save
24. [ ] Error toast shown on failure
25. [ ] Cancel closes sheet/dialog (confirm if dirty)
26. [ ] Test Panel (task 131) integrated and functional
27. [ ] Responsive design (mobile-friendly)
28. [ ] Accessibility: form labels, ARIA attributes
29. [ ] Manual testing: create rule with multiple conditions/actions, edit, delete, save
30. [ ] Verify Zod validation on submit
