---
id: 060
title: Enhance onboarding wizard Step 3 with lease fields
tier: Opus
depends_on: [59]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 060 — Onboarding Step 3: Lease Fields

## Objective

Add the same collapsible lease fields from the TenantForm to the onboarding wizard Step 3 inline tenant form.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "P1-003: Onboarding Wizard" integration section.

File: `apps/web/components/onboarding/onboarding-wizard.tsx`

## Implementation

1. Add collapsible lease section to the inline tenant form in Step 3
2. Same fields as TenantForm: lease_type, lease_start_date, lease_end_date, rent_due_day, move_in_date
3. Default collapsed so onboarding stays fast
4. Hint text: "You can add lease details now or later from the Properties page."
5. Update `TenantEntry` interface to include lease fields (may already exist from task 034)
6. Update handleSaveAll to include lease fields in tenant payloads

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Collapsible lease section in Step 3 inline form
3. [ ] Default collapsed
4. [ ] All lease fields functional
5. [ ] Lease data preserved in tenant list
6. [ ] Lease data included in handleSaveAll payload
7. [ ] Lease fields appear in Step 5 review
