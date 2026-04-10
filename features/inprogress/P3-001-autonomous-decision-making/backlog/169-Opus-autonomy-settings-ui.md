---
id: 169
title: Build Autonomy Settings UI — new "Autopilot" tab on /settings
tier: Opus
depends_on: [162, 167]
feature: P3-001-autonomous-decision-making
---

# 169 — Autonomy Settings UI

## Objective
Build the autonomy configuration panel as a new tab on the `/settings` page, allowing landlords to fine-tune autonomy behavior.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

The settings panel is where landlords control autonomy: confidence threshold, spending caps, category exclusions, vendor preferences, emergency handling, and rollback window. Clear explanations and confirmation dialogs ensure safe configuration.

## Implementation

1. Locate existing `/settings` page (likely `apps/web/app/(landlord)/settings/page.tsx`)
2. Add "Autopilot" tab to the settings tab group (alongside existing tabs like Account, Preferences, etc.)
3. Build the Autopilot tab UI with sections:
   - **Confidence Threshold**:
     - Slider input (0-1, increment 0.05)
     - Label showing current value (e.g., "85%")
     - Helper text: "AI must be this confident to auto-dispatch. Higher = safer but less autonomous."
   - **Spending Limits**:
     - Per-decision cap: number input (min 0, step 10, default 500)
     - Monthly cap: number input (min 0, step 100, default 5000)
     - Helper: "Prevents overspending on individual decisions or monthly total."
   - **Category Management**:
     - Checkbox grid of categories (plumbing, electrical, hvac, structural, pest, appliance, general)
     - Label: "Exclude these categories from autopilot (require manual review)"
     - Checked boxes = excluded from autonomous dispatch
   - **Vendor Preferences**:
     - Toggle: "Prefer vendors only" (boolean)
     - Helper: "If on, AI only uses landlord's preferred vendors list."
     - Linked to existing vendor management (if applicable)
   - **Cost Estimates**:
     - Toggle: "Require cost estimate before dispatch" (boolean)
     - Helper: "If on, AI waits for vendor quote before deciding."
   - **Emergency Handling**:
     - Toggle: "Auto-dispatch emergencies" (boolean)
     - Helper: "If on, emergency requests auto-dispatch even with lower confidence."
   - **Rollback Window**:
     - Number input: hours (0-72, default 24)
     - Helper: "Time window to cancel a dispatch after auto-dispatch."
4. Wire API integration:
   - On page load, GET /api/autonomy/settings to populate form
   - On any field change, debounce (300ms) and PUT /api/autonomy/settings with updated values
   - Show "Saving..." indicator during PUT
   - Show "Saved" confirmation on success
   - Show error toast on failure with retry button
5. Add confirmation dialog for first-time enable:
   - If paused=true and user makes first settings change, show warning:
     - "Autopilot is currently disabled. Enable it now?" with Yes/No
     - If Yes, set paused=false in settings
6. Validation:
   - confidence_threshold: 0 <= x <= 1 (show error if out of range)
   - spending caps: positive numbers (show error if <= 0)
   - rollback_window_hours: 0-72 (show error if out of range)
7. Styling:
   - Use shadcn: Card, Slider, Input, Checkbox, Toggle, Label, Button
   - Organized layout with clear sections
   - Inline helper text for each setting
8. Error states:
   - Show field-level error messages
   - Disable submit until valid
   - Toast on API errors

## Acceptance Criteria
1. [ ] "Autopilot" tab added to settings page
2. [ ] Confidence threshold slider works (0-1)
3. [ ] Per-decision cap input accepts positive numbers
4. [ ] Monthly cap input accepts positive numbers
5. [ ] Category checkbox grid shows all 7 categories
6. [ ] Vendor preferences toggle works
7. [ ] Cost estimate toggle works
8. [ ] Emergency handling toggle works
9. [ ] Rollback window input validates (0-72)
10. [ ] Form loads current settings on mount
11. [ ] Changes saved via PUT /api/autonomy/settings (debounced)
12. [ ] "Saving..." indicator shown during PUT
13. [ ] "Saved" confirmation shown on success
14. [ ] Error toast shown on failure
15. [ ] First-enable confirmation dialog appears
16. [ ] Validation prevents invalid values
17. [ ] Field-level error messages shown
18. [ ] Responsive on mobile
