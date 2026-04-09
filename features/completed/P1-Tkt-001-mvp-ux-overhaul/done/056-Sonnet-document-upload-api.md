---
id: 056
title: Build document upload API route — POST /api/documents/upload
tier: Sonnet
depends_on: [25, 26]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 056 — Document Upload API

## Objective

Build the document upload endpoint that accepts multipart/form-data, stores files in the `property-documents` Supabase Storage bucket, and inserts records in the `documents` table.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "Document Upload" tech approach section. Follow existing upload pattern at `apps/web/app/api/upload/route.ts`.

## Implementation

Create `apps/web/app/api/documents/upload/route.ts`:

1. Auth check via Clerk
2. Accept `multipart/form-data`: `files` (File[]), `property_id`, `document_type`, `tenant_id?`, `description?`
3. Validate with `documentUploadSchema`
4. Validate files: max 10, max 10 MB each, allowed types (image/*, application/pdf, .doc, .docx)
5. Upload each to `property-documents` bucket: path `{landlord_id}/{property_id}/{timestamp}-{uuid}.{ext}`
6. Insert `documents` row per file
7. Return created document records

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Accepts multipart/form-data with files + metadata
3. [ ] Files stored in `property-documents` bucket
4. [ ] Document records created in DB
5. [ ] File count limit (10) enforced
6. [ ] File size limit (10 MB) enforced
7. [ ] File type validation (images + PDF + doc)
8. [ ] Auth check: landlord only
9. [ ] Returns created document records
