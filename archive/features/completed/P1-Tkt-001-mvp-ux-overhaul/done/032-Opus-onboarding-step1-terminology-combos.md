---
id: 032
title: Update onboarding wizard Step 1 — terminology, combo notes, autopilot note
tier: Opus
depends_on: [30]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 032 — Onboarding Step 1: Terminology + Combo Notes + Autopilot Note

## Objective

Update Step 1 (AI Preferences) of the onboarding wizard with three changes: rename "AI"→"Agent" terminology, add delegation+risk combo implication notes, and add autopilot spending note.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/onboarding-ux-refinements.md` — Changes 1, 2, 4, 5 and "Step 1 Changes" UI section.

File: `apps/web/components/onboarding/onboarding-wizard.tsx`

## Implementation

### Change 1 — Terminology
- Line 358 area: `"How should your AI prioritize?"` → `"How should your Agent prioritize?"`
- Line 391 area: `"How much should Liz handle on her own?"` → `"How much should your agent handle on its own?"`

### Change 4 — Autopilot Note
Below the disabled "Full autopilot" OptionCard:
```tsx
<p className="text-xs text-muted-foreground ml-13 -mt-1">
  When available, you'll set a maximum spending amount per job.
</p>
```

### Change 5 — Combo Implication Notes
Create `apps/web/components/onboarding/combo-note.tsx`:
- Accepts `riskAppetite` and `delegationMode` props
- Returns a subtle `<p className="text-sm text-muted-foreground">` with the relevant note, or `null`
- Place after delegation mode cards, before Next button

Combo note lookup:
```typescript
const COMBO_NOTES: Record<string, string> = {
  "manual_speed_first": "You've chosen to approve everything manually while prioritizing speed. Your agent will recommend fast vendors but wait for your approval.",
  "manual_cost_first": "You've chosen to approve everything manually while minimizing costs. Your agent will suggest the most affordable options for you to review.",
  "assist_speed_first": "Your agent will auto-approve small jobs under your threshold and prioritize fast vendors.",
  // ... etc
};
```

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Header reads "How should your Agent prioritize?"
3. [ ] Delegation header reads "How much should your agent handle on its own?"
4. [ ] Note under Full autopilot: "When available, you'll set a maximum spending amount per job."
5. [ ] Combo note appears for "manual + speed_first" selection
6. [ ] Combo note updates reactively when selections change
7. [ ] No combo note for default/balanced selections
8. [ ] "Use default AI settings" skip link still works
