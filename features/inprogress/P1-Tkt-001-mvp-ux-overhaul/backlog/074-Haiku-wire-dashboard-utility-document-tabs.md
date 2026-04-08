---
id: 074
title: Wire dashboard drill-down Documents/Photos/Utility tabs to real components
tier: Haiku
depends_on: [53, 65, 68]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 074 — Wire Dashboard Tabs to Real Components

## Objective

Replace the placeholder Documents and Photos tabs in the property drill-down with the real DocumentGallery and add the UtilityInfoCard to the Overview tab.

## Context

Task 051 creates placeholders. Task 065 builds the document components. Task 068 builds the utility card. This task wires them together in the dashboard drill-down.

## Implementation

In `apps/web/components/dashboard/property-drilldown.tsx`:

1. **Documents tab**: Replace `DocumentsPlaceholder` with `DocumentUploader` + `DocumentGallery` (same pattern as the properties Sheet from task 065)
2. **Photos tab**: Replace `PhotosPlaceholder` with `DocumentGallery` filtered to `document_type = 'property_photo'`
3. **Overview tab**: Add `UtilityInfoCard` below rent info, above work orders
4. Wire data fetches for documents and utilities

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] Documents tab shows real uploader + gallery
3. [ ] Photos tab shows gallery filtered to property photos
4. [ ] Utility card appears in Overview tab
5. [ ] All data fetches work within the drill-down context
