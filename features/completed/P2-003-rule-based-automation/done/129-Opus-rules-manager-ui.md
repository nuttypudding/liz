---
id: 129
title: Build Rules Manager UI — settings tab, rule list, drag-reorder
tier: Opus
depends_on: [121, 128]
feature: P2-003-rule-based-automation
---

# 129 — Rules Manager UI

## Objective
Build the Rules Manager interface in the Settings page with rule list, drag-and-drop reordering, enable/disable toggling, and CRUD controls.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

Landlords manage automation rules from a dedicated "Automation Rules" tab in Settings. Rules are displayed in priority order with drag-to-reorder, enable/disable toggle, and overflow menu for Edit/Test/Delete.

## Implementation

1. Create new Settings tab: "Automation Rules"
   - Add tab option to existing Settings page navigation
   - Path: already in Settings, no new route needed

2. Build Rules Manager component (`apps/web/components/settings/RulesManager.tsx`):
   - Fetch rules on component mount: GET /api/rules
   - Display loading state while fetching
   - Display empty state if no rules (with "Create your first rule" button)
   - Display rule count badge (X active rules) and 25-rule limit indicator

3. Rule List component (`apps/web/components/rules/RuleList.tsx`):
   - Render sortable list using dnd-kit (@dnd-kit/sortable)
   - Each rule displays:
     - Drag handle (⋮⋮ icon or similar)
     - Rule name (primary text)
     - Description (secondary text, truncated)
     - Enable/disable checkbox (toggle with PATCH request)
     - Priority badge (e.g., "1st", "2nd")
     - Overflow menu (three-dot icon) with:
       - Edit (opens Rule Builder sheet)
       - Test (opens Rule Test Panel)
       - Delete (confirms and calls DELETE /api/rules/[id])
   - Reorder on drag end:
     - Calculate new_priority based on drop position
     - Call PATCH /api/rules/[id]/reorder with new_priority
     - Optimistically update UI before response
     - Handle drag cancel (revert to original order)

4. Enable/Disable Toggle:
   - Checkbox per rule
   - On change: PATCH /api/rules/[id] with { enabled: true|false }
   - No full page refresh needed

5. Create Rule Button:
   - "Create Rule" button at top or bottom of list
   - Opens Rule Builder sheet (task 130) in create mode
   - After save, add new rule to list

6. Styling:
   - Use Tailwind CSS + shadcn components (checkbox, button, dropdown menu)
   - Responsive: adapt drag handle visibility on mobile
   - Hover states on rule rows
   - Visual feedback during drag (opacity, shadow)
   - Disabled state styling for disabled rules

7. UX Details:
   - Disable drag-reorder if list is small (1 rule)
   - Show "25 rules max" message if at limit
   - Confirmation modal before deleting rule
   - Toast notification on successful create/update/delete
   - Inline error messages (e.g., "Failed to enable rule")

8. Data Flow:
   - Component state: `rules` (from API), `isLoading`, `isDragging`
   - Fetch rules periodically or on-demand (not real-time)
   - Invalidate cache on create/update/delete

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] Rules Manager component renders in Settings
3. [ ] Rules fetched from GET /api/rules and displayed in list
4. [ ] Empty state shown when no rules
5. [ ] Rule count badge shown correctly
6. [ ] 25-rule limit indicator displayed
7. [ ] Drag-and-drop reordering works (dnd-kit)
8. [ ] Reorder calls PATCH /api/rules/[id]/reorder
9. [ ] Enable/disable checkbox toggles rule enabled status
10. [ ] Enable/disable calls PATCH /api/rules/[id]
11. [ ] Overflow menu shows Edit/Test/Delete options
12. [ ] Edit opens Rule Builder (task 130)
13. [ ] Test opens Rule Test Panel (task 131)
14. [ ] Delete confirms and calls DELETE /api/rules/[id]
15. [ ] Create Rule button opens Rule Builder in create mode
16. [ ] Optimistic UI updates for drag, enable/disable, delete
17. [ ] Error handling: show toasts on failures
18. [ ] Styling consistent with existing Settings UI
19. [ ] Responsive design (mobile-friendly)
20. [ ] Accessibility: keyboard navigation, ARIA labels
21. [ ] Manual testing: create/reorder/enable/disable/delete rules
22. [ ] Verify rule order persists after page reload
