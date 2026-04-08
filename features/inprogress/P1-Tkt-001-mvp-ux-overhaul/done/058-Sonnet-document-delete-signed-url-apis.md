---
id: 058
title: Build document delete + signed URL API routes
tier: Sonnet
depends_on: [25, 26]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 058 — Document Delete + Signed URL APIs

## Objective

Build the DELETE and signed URL endpoints for document management.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "Signed URLs" and "New API Routes" sections.

## Implementation

### DELETE `/api/documents/[id]/route.ts`
1. Auth check (landlord only, verify ownership via `landlord_id`)
2. Delete from `property-documents` storage bucket
3. Delete from `documents` table
4. Return 204 No Content

### GET `/api/documents/[id]/url/route.ts`
1. Auth check (landlord or tenant, verify ownership)
2. Fetch document record
3. Call `supabase.storage.from('property-documents').createSignedUrl(path, 3600)` (1-hour expiry)
4. Return `{ url: string }`

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] DELETE removes storage file + DB row
3. [ ] DELETE auth: landlord only
4. [ ] GET url returns signed URL with 1-hour expiry
5. [ ] GET url auth: landlord or tenant of property
6. [ ] 404 for non-existent document
7. [ ] Graceful handling of already-deleted storage files
