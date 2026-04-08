---
id: 072
title: Address change integration — re-detect dialog with merge logic
tier: Sonnet
depends_on: [67, 69]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 072 — Address Change Re-Detection

## Objective

When a landlord changes a property's address, prompt to re-detect utility providers. Only overwrite unconfirmed entries.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/utility-company-integration.md` — "Re-Suggestion Trigger" and "Property Address Change" integration sections.

## Implementation

1. In property edit flow, detect address field change (compare old vs. new)
2. Show Dialog: "Address changed. Re-detect utility providers? (Only updates unconfirmed entries.)"
3. If confirmed: POST suggest endpoint with new address
4. Merge logic: AI suggestions only overwrite rows where `confirmation_status = 'ai_suggested'`
5. Confirmed and N/A rows are preserved unchanged

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Dialog appears when address changes
3. [ ] "Yes" triggers new AI lookup
4. [ ] Only `ai_suggested` rows are overwritten
5. [ ] Confirmed rows preserved
6. [ ] N/A rows preserved
7. [ ] "No" dismisses without changes
