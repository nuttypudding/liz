---
id: 023
title: Sort vendors by preferred status and priority rank
tier: Sonnet
depends_on: [016]
feature: landlord-onboarding-decision-profile
---

# 023 — Vendor Sorting Integration

## Objective
Update vendor queries to sort by `preferred` first, then `priority_rank`, so the AI and UI display preferred vendors at the top.

## Context
Feature plan: `features/inprogress/P1-003-landlord-onboarding-decision-profile/README.md` — see "Integration Points > Vendor Suggestion".
Existing vendor queries: `apps/web/app/api/properties/route.ts` pattern.
New columns added by task 016: `vendors.preferred` (boolean) and `vendors.priority_rank` (int).

## Implementation

1. Find all Supabase queries that fetch vendors (likely in API routes and any server components).

2. Update the `.order()` clause to sort by:
   ```
   .order('preferred', { ascending: false })
   .order('priority_rank', { ascending: false })
   .order('name', { ascending: true })
   ```

3. If a dispatch route exists (`/api/requests/[id]/dispatch`), update vendor selection logic:
   - For `cost_first` landlords: add note "Landlord prefers cost-effective solutions"
   - For `speed_first` landlords: suggest vendors with fastest response times first

## Acceptance Criteria
1. [x] Verify correct model tier (Sonnet)
2. [ ] Vendor lists show preferred vendors first
3. [ ] Priority rank used as secondary sort
4. [ ] Vendor suggestion respects landlord risk appetite where applicable
