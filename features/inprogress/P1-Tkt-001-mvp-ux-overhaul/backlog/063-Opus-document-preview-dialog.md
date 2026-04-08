---
id: 063
title: Build DocumentPreviewDialog component
tier: Opus
depends_on: [58]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 063 — DocumentPreviewDialog Component

## Objective

Build the full-screen document preview dialog for images and download trigger for non-image files.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "Document Gallery" section (click-to-preview behavior).

## Implementation

Create `apps/web/components/documents/document-preview-dialog.tsx`:

1. shadcn `Dialog` (or fullscreen modal)
2. For images: display full-size image loaded via signed URL
3. For PDFs/docs: show file info + "Download" button
4. Close button / click-outside to dismiss
5. Props: `document: Document | null`, `open: boolean`, `onClose: () => void`
6. Loading state while signed URL is being fetched

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Image preview shows full-size image
3. [ ] PDF shows download button
4. [ ] Loading indicator during URL fetch
5. [ ] Close button works
6. [ ] Click-outside dismisses
