---
id: 061
title: Build DocumentUploader component
tier: Opus
depends_on: [56]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 061 — DocumentUploader Component

## Objective

Build the reusable document upload component with file selection, document-type categorization, and upload progress.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "Screen 2: Document Upload Section" and "Document Upload" tech approach.

## Implementation

Create `apps/web/components/documents/document-uploader.tsx`:

1. **Document type** `Select`: lease, receipt, inspection_move_in, inspection_move_out, property_photo, other
2. **Description** text input (optional)
3. **Tenant** select dropdown (optional, populated from property's tenants)
4. **File drop zone** / file input:
   - Accepts: `image/*`, `application/pdf`, `.doc`, `.docx`
   - Max 10 files, 10 MB each
   - File list with name, size, remove button
   - Image files: small thumbnail preview
   - PDF/doc: file-type icon (FileText from lucide)
5. **Upload progress** bar during upload
6. **Upload button** → POST `/api/documents/upload`
7. On success: toast notification, call `onUploadComplete` callback

Props: `propertyId: string`, `tenants: Tenant[]`, `onUploadComplete: () => void`

shadcn components: `Select`, `Input`, `Button`, `Progress`, `Card`

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Document type selector works
3. [ ] File selection via click or drag-and-drop
4. [ ] Image thumbnails displayed
5. [ ] PDF/doc files show type icon
6. [ ] Remove button per file
7. [ ] Max 10 files, 10 MB each enforced
8. [ ] Progress bar during upload
9. [ ] Toast on success
10. [ ] Callback fires on complete
