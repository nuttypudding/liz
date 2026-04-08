---
id: 044
title: Modify properties API — include rent_due_day in responses
tier: Sonnet
depends_on: [25]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 044 — Properties API: Include rent_due_day

## Objective

Update the properties API to include the new `rent_due_day` column in responses and accept it in updates.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — Integration Point 5.

Files:
- `apps/web/app/api/properties/route.ts`
- `apps/web/app/api/properties/[id]/route.ts`

## Implementation

1. Update GET to include `rent_due_day` in select query
2. Update POST to accept `rent_due_day` (default 1)
3. Update PATCH to accept `rent_due_day`

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] GET returns `rent_due_day` for each property
3. [ ] POST accepts `rent_due_day`
4. [ ] PATCH updates `rent_due_day`
5. [ ] Default value is 1 when not specified
