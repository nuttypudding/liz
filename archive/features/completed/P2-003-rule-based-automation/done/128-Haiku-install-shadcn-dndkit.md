---
id: 128
title: Install new shadcn components (checkbox) + dnd-kit
tier: Haiku
depends_on: []
feature: P2-003-rule-based-automation
---

# 128 — Install shadcn Checkbox + dnd-kit for Drag-and-Drop

## Objective
Install shadcn checkbox component and dnd-kit library for drag-and-drop reordering of rules.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

The Rules Manager UI (task 129) uses drag-and-drop to reorder rules and checkboxes to toggle enable/disable. Both libraries must be installed before UI development.

## Implementation

1. Install shadcn checkbox component:
   ```bash
   cd apps/web
   npx shadcn-ui@latest add checkbox
   ```
   - Confirms shadcn/ui is installed and available
   - Adds checkbox to components/ui/checkbox.tsx

2. Install dnd-kit packages:
   ```bash
   cd apps/web
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```
   - @dnd-kit/core: core drag-and-drop functionality
   - @dnd-kit/sortable: sortable list preset
   - @dnd-kit/utilities: helper utilities

3. Optionally install additional dnd-kit packages for enhanced UX:
   ```bash
   npm install @dnd-kit/modifiers
   ```
   - For transform modifiers during drag

4. Verify installation:
   - Check apps/web/node_modules/@dnd-kit/ directory exists
   - Check components/ui/checkbox.tsx exists
   - Import both in a test file to verify no errors

5. Update apps/web/package.json:
   - Verify new dependencies listed
   - No version conflicts with existing packages

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] shadcn checkbox component installed
3. [ ] components/ui/checkbox.tsx created
4. [ ] @dnd-kit/core installed
5. [ ] @dnd-kit/sortable installed
6. [ ] @dnd-kit/utilities installed
7. [ ] @dnd-kit/modifiers installed (optional)
8. [ ] No dependency conflicts
9. [ ] No TypeScript errors on imports
10. [ ] Ready for Rules Manager UI development (task 129)
