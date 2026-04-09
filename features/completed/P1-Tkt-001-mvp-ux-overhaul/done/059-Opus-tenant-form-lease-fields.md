---
id: 059
title: Enhance TenantForm with collapsible lease fields section
tier: Opus
depends_on: [26, 55]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 059 — TenantForm: Collapsible Lease Fields

## Objective

Add a collapsible "Lease Details" section to the TenantForm with lease type, start/end dates, rent due day, and move-in date.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "Screen 1: Enhanced Tenant Form" and "Lease Fields on Tenants" tech approach.

File: `apps/web/components/forms/tenant-form.tsx`

## Implementation

1. Add collapsible "Lease Details" section below existing contact fields using shadcn `Collapsible`
2. Fields:
   - Lease type: `Select` (Yearly, Month-to-Month)
   - Lease start date: `Input type="date"`
   - Lease end date: `Input type="date"` (hidden if month-to-month)
   - Rent due day: `Select` (1st through 28th)
   - Move-in date: `Input type="date"`
3. All fields optional
4. Default collapsed — subtle "Lease Details (optional)" trigger text
5. Hint: "You can add lease details now or later."
6. When editing existing tenant, pre-fill and auto-expand if lease data exists

Responsive: Single column on mobile. Lease start/end dates side-by-side on tablet+.

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Collapsible "Lease Details" section present
3. [ ] All 5 lease fields functional
4. [ ] Lease end date hidden when month-to-month selected
5. [ ] Default collapsed for new tenants
6. [ ] Auto-expanded when editing tenant with lease data
7. [ ] All fields save and reload correctly via API
8. [ ] Responsive layout works
