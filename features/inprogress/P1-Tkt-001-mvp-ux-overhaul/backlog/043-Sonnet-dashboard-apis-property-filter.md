---
id: 043
title: Modify existing dashboard APIs — add ?propertyId filter
tier: Sonnet
depends_on: []
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 043 — Dashboard APIs: Add Property Filter

## Objective

Add optional `?propertyId=` query parameter to existing dashboard endpoints to filter data to a single property.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Modified API Routes" section.

## Implementation

### 1. Stats API (`apps/web/app/api/dashboard/stats/route.ts`)
- Read optional `propertyId` from search params
- When present, filter to that single property (change `propertyIds` array to `[propertyId]`)
- When absent, existing behavior (all properties)

### 2. Spend Chart API (`apps/web/app/api/dashboard/spend-chart/route.ts`)
- Read optional `propertyId` from search params
- When present, group by month (time series) instead of by property
- When absent, existing behavior (per-property comparison)

### 3. Requests API (`apps/web/app/api/requests/route.ts`)
- Read optional `propertyId` from search params
- When present, filter `WHERE property_id = ?`
- When absent, existing behavior (all requests)

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Stats API filters correctly with `?propertyId=`
3. [ ] Spend chart returns time series for single property
4. [ ] Requests API filters by property
5. [ ] All endpoints still work without the parameter (backward compat)
6. [ ] Invalid propertyId returns empty results, not error
