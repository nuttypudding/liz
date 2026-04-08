---
id: 057
title: Build document list API route — GET /api/properties/[id]/documents
tier: Sonnet
depends_on: [25, 26]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 057 — Document List API

## Objective

Build the endpoint that lists documents for a property with optional type filtering.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/lease-document-management.md` — "New API Routes".

## Implementation

Create `apps/web/app/api/properties/[id]/documents/route.ts`:

1. Auth check (landlord or tenant of property)
2. Query `documents` table: `WHERE property_id = ?`
3. Optional `?type=` filter: `AND document_type = ?`
4. Join tenant name if `tenant_id` is set
5. Order by `uploaded_at DESC`
6. Return list of Document objects

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Returns all documents for a property
3. [ ] `?type=` filter works
4. [ ] Includes tenant name when associated
5. [ ] Ordered newest first
6. [ ] Auth check: owner or tenant
