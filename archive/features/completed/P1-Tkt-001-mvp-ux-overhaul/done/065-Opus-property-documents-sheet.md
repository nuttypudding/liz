---
id: 065
title: Add property documents Sheet to properties page (uploader + gallery)
tier: Opus
depends_on: [61, 62, 63]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 065 — Property Documents Sheet

## Objective

Add a "Documents (N)" button to each property card on the /properties page that opens a Sheet containing the DocumentUploader and DocumentGallery.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "Screen 4: Property Detail Documents Tab (Approach A — Sheet)".

## Implementation

Modify `apps/web/app/(landlord)/properties/page.tsx`:

1. Add "Documents (N)" button to each property card (count from lightweight fetch or client-side)
2. Button triggers a Sheet (side panel, wide)
3. Sheet contains:
   - SheetHeader: "Documents — {property.name}"
   - Collapsible: "Upload New Document" → DocumentUploader (property_id pre-set, tenants pre-loaded)
   - DocumentGallery (property_id)
4. On upload complete or document delete, gallery refreshes
5. Document count on button updates

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] "Documents (N)" button on each property card
3. [ ] Count is accurate
4. [ ] Sheet opens with uploader + gallery
5. [ ] Upload from Sheet works, gallery refreshes
6. [ ] Delete from Sheet works, gallery refreshes, count updates
7. [ ] Sheet is wide enough for gallery grid
