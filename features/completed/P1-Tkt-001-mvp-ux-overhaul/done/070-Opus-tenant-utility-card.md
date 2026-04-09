---
id: 070
title: Build TenantUtilityCard — read-only tenant-facing card (no account numbers)
tier: Opus
depends_on: [29, 66]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 070 — TenantUtilityCard Component

## Objective

Build the read-only tenant-facing utility card that shows provider names, phones, and websites — but NO account numbers.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/utility-company-integration.md` — "Screen 4: Tenant Utility Info View".

## Implementation

Create `apps/web/components/properties/tenant-utility-card.tsx`:

1. Card with header "Utility Companies"
2. For each confirmed/ai_suggested utility (excludes N/A):
   - Icon + utility type label
   - Provider name
   - Phone (clickable tel: link)
   - Website (clickable external link)
   - NO account number field
3. Note: "Contact your landlord if any info is incorrect."

Responsive: Single-column list. Compact rows optimized for mobile touch targets.

Props: `utilities: PropertyUtility[]` (already filtered by tenant API)

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Shows only confirmed + ai_suggested utilities
3. [ ] N/A utilities hidden
4. [ ] Account numbers NOT shown
5. [ ] Phone and website clickable
6. [ ] Note about contacting landlord present
