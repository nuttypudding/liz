---
id: 062
title: Build DocumentGallery + DocumentCard components
tier: Opus
depends_on: [57, 58]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 062 — DocumentGallery + DocumentCard Components

## Objective

Build the per-property document gallery with type filtering tabs and document cards showing thumbnails/icons.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "Screen 3: Document Gallery" and "Document Gallery" tech approach.

## Implementation

### DocumentGallery (`apps/web/components/documents/document-gallery.tsx`)
1. Fetches documents via GET `/api/properties/[id]/documents`
2. Filter tabs using shadcn `Tabs`: All, Leases, Receipts, Move-in, Move-out, Property Photos, Other
3. Responsive grid: 2 cols mobile, 3 tablet, 4 desktop
4. Empty state per filter tab
5. Props: `propertyId: string`

### DocumentCard (`apps/web/components/documents/document-card.tsx`)
1. Thumbnail (images) or FileType icon (PDF/doc)
2. Document type badge
3. File name (truncated)
4. Upload date
5. Tenant name if associated
6. DropdownMenu: Preview, Download, Delete
7. Delete: confirmation AlertDialog
8. Props: `document: Document`, `onDelete: () => void`, `onPreview: () => void`

Signed URLs fetched lazily for thumbnails.

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Gallery loads documents for property
3. [ ] Image thumbnails render
4. [ ] PDF/doc files show type icon
5. [ ] Filter tabs work (All, Leases, etc.)
6. [ ] Empty state for filters with no results
7. [ ] Document card shows all metadata
8. [ ] Delete with confirmation works
9. [ ] Responsive grid: 2/3/4 columns
