---
id: 069
title: Build UtilitySetupSheet — AI suggestion review, N/A toggles, Confirm All
tier: Opus
depends_on: [29, 66, 67]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 069 — UtilitySetupSheet Component

## Objective

Build the Sheet for reviewing/editing utility info — shows AI suggestions with skeleton loading, N/A toggles per utility type, "Confirm All" button, and form fields for each type.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/utility-company-integration.md` — "Screen 2: Utility Setup Flow" and "Screen 3: Utility Edit Form" designs.

## Implementation

Create `apps/web/components/properties/utility-setup-sheet.tsx`:

1. SheetHeader: title, description with address, "Confirm All" button
2. SheetContent (ScrollArea): 6 utility type sections
3. Each section:
   - Icon + type label + confidence badge (if AI-suggested)
   - N/A Switch toggle (collapses fields when ON)
   - Company name, phone, website, account number inputs
   - Account number: type=password with Show toggle
4. AI suggestion loading: Skeleton rows during POST suggest call
5. "Re-Detect" button for re-running AI suggestions (only overwrites `ai_suggested` rows)
6. "Save" → PUT `/api/properties/[id]/utilities`
7. "Cancel" → close and discard

Status logic:
- Untouched AI suggestion → `ai_suggested`
- Landlord edited any field → `confirmed`
- "Confirm All" clicked → all become `confirmed`
- N/A toggle → `not_applicable`

Props: `propertyId: string`, `address: string`, `existingUtilities: PropertyUtility[]`, `open: boolean`, `onClose: () => void`, `onSave: () => void`

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] All 6 utility types listed with form fields
3. [ ] AI suggestions populate electric, gas, water, trash
4. [ ] Internet + HOA sections blank (not AI-suggested)
5. [ ] Skeleton loading during AI lookup
6. [ ] N/A toggle collapses fields
7. [ ] "Confirm All" changes all ai_suggested → confirmed
8. [ ] Save upserts all rows
9. [ ] Cancel discards changes
10. [ ] Confidence tooltips (high/medium/low)
