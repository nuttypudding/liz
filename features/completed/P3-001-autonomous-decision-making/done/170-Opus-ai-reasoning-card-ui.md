---
id: 170
title: Build AI Reasoning Card — component for /requests/[id] right column
tier: Opus
depends_on: [163]
feature: P3-001-autonomous-decision-making
---

# 170 — AI Reasoning Card UI Component

## Objective
Build a reusable card component that displays autonomous decision reasoning on the request detail page (`/requests/[id]`), showing confidence score, reasoning, and safety checks.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

When a request is processed autonomously, landlords want to understand why the AI made that decision. The reasoning card shows all the logic: confidence score, key factors, decision, safety checks passed, actions taken, and confirm/override options.

## Implementation

1. Create component: `apps/web/components/autonomy/AIReasoningCard.tsx`
2. Component props:
   - `decision: AutonomousDecision` (full decision object)
   - `onConfirm: () => Promise<void>` (callback for confirm button)
   - `onOverride: (reason: string) => Promise<void>` (callback for override)
   - `loading?: boolean` (disable buttons during mutation)
3. Layout with sections:
   - **Header**:
     - Large circular confidence score indicator (0-1, color gradient: red < 0.7, yellow 0.7-0.85, green >= 0.85)
     - Decision label: "Auto-dispatched" or "Escalated for review"
     - Timestamp (created_at formatted)
   - **Summary**:
     - Short reasoning text (one sentence from decision.reasoning)
   - **Reasoning bullets**:
     - 2-3 bullet points extracted from decision.reasoning
     - Explain key factors contributing to decision
   - **Safety Checks** (expandable/collapsible):
     - Checklist of passed/failed checks from decision.safety_checks:
       - Spending cap ok
       - Category not excluded
       - Vendor available
       - Cost within estimate
       - Emergency eligible (if applicable)
     - Color-coded icons (checkmark for pass, x for fail)
   - **Actions Taken** (if dispatch):
     - List of actions from decision.actions_taken:
       - Vendor notified: [vendor name]
       - Estimated cost: $XXX
       - Request status: dispatched
   - **Confidence factors** (expandable):
     - Table showing weighted factors from decision.factors:
       - Historical: 35% × 0.8 = 0.28
       - Rules: 25% × 0.9 = 0.225
       - Cost: 20% × 0.8 = 0.16
       - Vendor: 10% × 0.85 = 0.085
       - Category: 10% × 1.0 = 0.1
       - Total: 0.94
   - **Landlord Actions**:
     - If status='pending_review':
       - "Confirm" button (calls onConfirm)
       - "Override" button (opens modal with reason textbox)
     - If status='confirmed' or 'overridden':
       - Show review status and reason if overridden
4. Override dialog:
   - Modal title: "Override autonomous decision"
   - Text field: "Why are you overriding this decision?"
   - Buttons: Cancel, Submit
   - On submit, call onOverride(reason)
   - Disable submit until reason has content
5. Loading states:
   - Spinner on buttons during mutation
   - Disabled state while loading
6. Error handling:
   - Show toast on onConfirm/onOverride error
7. Styling:
   - Use shadcn: Card, Badge, Button, Dialog, Progress
   - Circular confidence score using SVG or radial progress component
   - Color coding for safety checks
   - Expandable sections (Collapsible or Tabs component)

## Acceptance Criteria
1. [ ] Component created at apps/web/components/autonomy/AIReasoningCard.tsx
2. [ ] Confidence score displayed with color gradient
3. [ ] Decision type label shown (auto-dispatch or escalate)
4. [ ] Reasoning bullets displayed clearly
5. [ ] Safety checks section expandable
6. [ ] All safety checks listed with pass/fail icons
7. [ ] Actions taken section shows vendor and cost
8. [ ] Confidence factors table shows weighted breakdown
9. [ ] Confirm button works when status='pending_review'
10. [ ] Override button shows modal with reason field
11. [ ] Override reason required (submit disabled if empty)
12. [ ] Buttons disabled during loading
13. [ ] Error toast shown on API failure
14. [ ] Timestamp formatted readably
15. [ ] Component responsive on mobile
16. [ ] Integrates into request detail page right column
