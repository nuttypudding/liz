---
id: 050
title: Build TenantList component in drill-down — reuse tenant card + TenantForm Sheet
tier: Sonnet
depends_on: [47]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 050 — TenantList in Drill-Down

## Objective

Build the tenant list for the property drill-down Tenants tab, reusing the existing tenant card pattern and TenantForm Sheet.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Screen Design: Property Drill-Down — Tenants Tab".

## Implementation

Create `apps/web/components/dashboard/drilldown-tenant-list.tsx`:

1. List all tenants for the property with name, email, phone, move-in date
2. Edit button → opens Sheet with TenantForm (existing component)
3. Delete button → confirmation AlertDialog → DELETE call
4. "Add Tenant" button at bottom → blank TenantForm in Sheet
5. Reuses pattern from PropertiesPage tenant display
6. Props: `propertyId: string`, `tenants: Tenant[]`, `onRefresh: () => void`

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] All tenants listed with contact info
3. [ ] Edit opens TenantForm pre-filled
4. [ ] Delete shows confirmation, removes tenant
5. [ ] Add Tenant creates new tenant for this property
6. [ ] List refreshes after add/edit/delete
7. [ ] Empty state: "No tenants yet"
