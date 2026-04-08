# Feature: MVP UX Overhaul

**ID**: P1-Tkt-001
**Ticket**: T-016
**Phase**: 1 — MVP
**Source**: Product owner (Liz) feedback on deployed onboarding wizard + dashboard

## TL;DR

Comprehensive UX overhaul driven by Liz's product review. Consolidates 4 sub-features and 1 bug fix: onboarding refinements (rename AI→Agent, fix slider, add fields), property-centric dashboard redesign, lease & document management, and utility company integration.

## Summary

After reviewing the deployed onboarding wizard and dashboard, Liz provided detailed feedback across 5 screenshots covering every aspect of the MVP. This consolidated feature captures all requested changes organized into 4 work streams:

1. **Onboarding UX Refinements** — 15 changes across the 4-step wizard: terminology updates (AI→Agent), slider bug fix, new form fields (apt/unit no., lease details, custom fields), phone formatting, vendor ranking, and delegation+risk combo notes.

2. **Property-Centric Dashboard** — Major dashboard redesign with a property selector bar (house icons), per-property drill-down with tabs (Overview, Work Orders, Tenants, Documents placeholder, Photos placeholder), rent status tracking, and late payment alerts.

3. **Lease & Document Management** — Lease tracking fields on tenants table, document upload with `property-documents` storage bucket, document gallery with type filtering, and tenant lease cards with status indicators.

4. **Utility Company Integration** — Hybrid Claude AI suggestion + manual confirmation for utility providers per property. Auto-detect on property creation, per-property utility info card with accordion details, tenant-facing read-only view.

## Sub-Plans

Each work stream has a detailed plan with full UX designs, data models, API routes, component hierarchies, and task breakdowns:

| File | Work Stream | Tasks | Bug Fix |
|------|-------------|-------|---------|
| [onboarding-ux-refinements.md](./onboarding-ux-refinements.md) | Onboarding wizard changes | 16 (4H/3S/7O) | Includes T-011 slider fix |
| [property-centric-dashboard.md](./property-centric-dashboard.md) | Dashboard redesign | 17 (3H/5S/6O) | — |
| [lease-document-management.md](./lease-document-management.md) | Lease fields + document storage | 15 (3H/4S/8O) | — |
| [utility-company-integration.md](./utility-company-integration.md) | Utility provider lookup | 12 (4H/4S/3O) | — |

## Tasks (025–074)

| ID | Tier | Title | Stream | Depends On |
|----|------|-------|--------|------------|
| **Shared Foundation** | | | | |
| 025 | Haiku | Database migration — all new tables and column additions | All | — |
| 026 | Haiku | Update TypeScript types and Zod schemas | All | 025 |
| 027 | Haiku | Create PhoneInput component | WS1 | — |
| 028 | Haiku | Create CustomFields component | WS1 | — |
| 029 | Haiku | Install accordion shadcn component | WS4 | — |
| **WS1: Onboarding UX** | | | | |
| 030 | Sonnet | Fix auto-approve slider bug (T-011) | WS1 | — |
| 031 | Sonnet | Update API routes for new fields | WS1 | 025, 026 |
| 032 | Opus | Onboarding Step 1 — terminology, combo notes, autopilot note | WS1 | 030 |
| 033 | Opus | Onboarding Step 2 — add apt_or_unit_no | WS1 | 026, 031 |
| 034 | Opus | Onboarding Step 3 — tenant form overhaul | WS1 | 026–028, 031 |
| 035 | Opus | Onboarding Step 4 — vendor ranking + custom fields | WS1 | 026, 028, 031 |
| 036 | Opus | Onboarding Step 5 — review summary + handleSaveAll | WS1 | 032–035 |
| 037 | Opus | Standalone PropertyForm — apt_or_unit_no | WS1 | 026, 031 |
| 038 | Opus | Standalone TenantForm — full update | WS1 | 026–028, 031 |
| 039 | Opus | Standalone VendorForm — ranking + custom fields | WS1 | 026, 028, 031 |
| 040 | Sonnet | Settings page — slider fix + terminology | WS1 | 030 |
| **WS2: Property-Centric Dashboard** | | | | |
| 041 | Sonnet | Rent status API | WS2 | 025, 026 |
| 042 | Sonnet | Rent payment recording API | WS2 | 025, 026 |
| 043 | Sonnet | Dashboard APIs — add ?propertyId filter | WS2 | — |
| 044 | Sonnet | Properties API — include rent_due_day | WS2 | 025 |
| 045 | Opus | PropertySelectorBar component | WS2 | — |
| 046 | Opus | Dashboard page refactor — URL-based selection | WS2 | 045 |
| 047 | Opus | PropertyDrillDown — tabbed layout | WS2 | 046 |
| 048 | Opus | RentSummaryCard + LatePaymentBanner | WS2 | 041 |
| 049 | Opus | WorkOrderHistory component | WS2 | 043 |
| 050 | Sonnet | TenantList in drill-down | WS2 | 047 |
| 051 | Haiku | Documents + Photos placeholders | WS2 | 047 |
| 052 | Sonnet | Rent payment recording dialog | WS2 | 042, 048 |
| 053 | Opus | Integrate all drill-down sections | WS2 | 047–052 |
| 054 | Opus | Dashboard responsive polish | WS2 | 053 |
| **WS3: Lease & Document Management** | | | | |
| 055 | Sonnet | Tenant API — lease fields | WS3 | 025, 026 |
| 056 | Sonnet | Document upload API | WS3 | 025, 026 |
| 057 | Sonnet | Document list API | WS3 | 025, 026 |
| 058 | Sonnet | Document delete + signed URL APIs | WS3 | 025, 026 |
| 059 | Opus | TenantForm — collapsible lease fields | WS3 | 026, 055 |
| 060 | Opus | Onboarding Step 3 — lease fields | WS3 | 059 |
| 061 | Opus | DocumentUploader component | WS3 | 056 |
| 062 | Opus | DocumentGallery + DocumentCard | WS3 | 057, 058 |
| 063 | Opus | DocumentPreviewDialog | WS3 | 058 |
| 064 | Opus | Tenant lease card | WS3 | 055, 059 |
| 065 | Opus | Property documents Sheet | WS3 | 061–063 |
| **WS4: Utility Company Integration** | | | | |
| 066 | Sonnet | Utility GET + PUT API routes | WS4 | 025, 026 |
| 067 | Sonnet | Utility suggest API (Claude Haiku) | WS4 | 025, 026 |
| 068 | Opus | UtilityInfoCard | WS4 | 029, 066 |
| 069 | Opus | UtilitySetupSheet | WS4 | 029, 066, 067 |
| 070 | Opus | TenantUtilityCard | WS4 | 029, 066 |
| 071 | Sonnet | Property creation utility integration | WS4 | 067, 069 |
| 072 | Sonnet | Address change re-detection | WS4 | 067, 069 |
| **Final** | | | | |
| 073 | Haiku | Update docs/endpoints.md | All | 031, 041–044, 055–058, 066, 067 |
| 074 | Haiku | Wire dashboard tabs to real components | All | 053, 065, 068 |

## Combined Metrics

- **Total tasks**: 50 (025–074)
- **Tier breakdown**: 7 Haiku, 14 Sonnet, 29 Opus
- **New DB tables**: `rent_payments`, `documents`, `property_utilities`
- **New storage bucket**: `property-documents`
- **Modified tables**: `properties` (add `apt_or_unit_no`, `rent_due_day`), `tenants` (add lease fields, `move_in_date`, `custom_fields`), `vendors` (add `custom_fields`)
- **New components**: ~20 (PhoneInput, CustomFields, PropertySelectorBar, PropertyDrillDown, RentSummaryCard, LatePaymentBanner, WorkOrderHistory, DocumentUploader, DocumentGallery, DocumentCard, DocumentPreviewDialog, UtilityInfoCard, UtilitySetupSheet, TenantUtilityCard, etc.)

## Cross-Cutting Dependencies

The 4 work streams share some foundations and have inter-dependencies:

```
Onboarding UX ──────────────────────────────────────────────────────────┐
  • Tenant form changes (lease fields, phone mask, custom fields)       │
  • These same components are reused by Dashboard Tenants tab           │
  └─────────────────────────────────────────────────────────────────────┘

Property-Centric Dashboard ─────────────────────────────────────────────┐
  • Documents tab = placeholder → filled by Lease & Document Mgmt      │
  • Photos tab = placeholder → filled by Lease & Document Mgmt         │
  • Utility card slot → filled by Utility Company Integration           │
  └─────────────────────────────────────────────────────────────────────┘

Lease & Document Management ────────────────────────────────────────────┐
  • Tenant lease fields feed into Dashboard's rent tracking             │
  • Document gallery integrates into Dashboard's Documents tab          │
  └─────────────────────────────────────────────────────────────────────┘

Utility Company Integration ────────────────────────────────────────────┐
  • Utility card renders inside Dashboard's property drill-down         │
  └─────────────────────────────────────────────────────────────────────┘
```

## Recommended Implementation Order

1. **Onboarding UX Refinements** — Fixes existing bugs and UX issues. Foundational form components (PhoneInput, CustomFields) are reused by later streams.
2. **Property-Centric Dashboard** — Creates the navigation structure that hosts the other two streams. Placeholder tabs for Documents and Photos.
3. **Lease & Document Management** — Fills in the Dashboard's Documents/Photos tabs. Extends tenant form with lease fields.
4. **Utility Company Integration** — Adds utility card to the Dashboard drill-down. Depends on P1-005 layout.

## Key Decisions (from sub-plans)

| Decision | Rationale |
|----------|-----------|
| Rename "AI" to "Agent" in user-facing copy | Product owner prefers professional, non-anthropomorphized language |
| Property selection via URL search param (`?property={id}`) | Bookmarkable, back-button support, shareable |
| Lease fields on tenants table (not separate leases table) | One active lease per tenant for MVP. Avoids over-engineering. |
| Sheet-based document access (not dedicated route) | Simpler for MVP. Components are relocatable when property detail page exists. |
| Claude Haiku for utility suggestions | Structured extraction task, 10x cheaper than Sonnet, sufficient quality |
| Account numbers stored but never sent to AI or shown to tenants | Privacy-first design |
| Manual rent payment recording for MVP | Stripe integration deferred to P2-004 |

## Open Questions

See individual sub-plan files for work-stream-specific open questions. Key cross-cutting questions:

1. **Implementation order within each stream** — Should all DB migrations across all 4 streams be batched into a single migration sprint? Recommendation: Yes, batch all schema changes first to avoid migration conflicts.

2. **Shared component library** — PhoneInput and CustomFields are used by both onboarding and standalone forms. Build these first as standalone components before integrating.

3. **Dashboard placeholder vs. full implementation** — Should Dashboard Documents/Photos tabs remain placeholders until Lease & Document Management is complete, or should they be wired immediately? Recommendation: Build placeholders first, wire when Document components are ready.
