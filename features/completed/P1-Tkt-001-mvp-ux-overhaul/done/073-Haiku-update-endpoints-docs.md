---
id: 073
title: Update docs/endpoints.md with all new API routes
tier: Haiku
depends_on: [31, 41, 42, 43, 44, 55, 56, 57, 58, 66, 67]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 073 — Update Endpoints Documentation

## Objective

Update `docs/endpoints.md` with all new and modified API routes from the MVP UX Overhaul.

## Context

Per CLAUDE.md: "Update that file whenever you add, rename, or remove an API route, app page, or environment URL."

## Implementation

Add to `docs/endpoints.md`:

### New Routes
- `GET /api/properties/[id]/rent-status` — Rent status for a property
- `POST /api/properties/[id]/rent-payments` — Record a rent payment
- `POST /api/documents/upload` — Upload documents to property-documents bucket
- `GET /api/properties/[id]/documents` — List documents (optional ?type= filter)
- `DELETE /api/documents/[id]` — Delete a document
- `GET /api/documents/[id]/url` — Get signed download URL
- `GET /api/properties/[id]/utilities` — Get utility info
- `PUT /api/properties/[id]/utilities` — Upsert utility info
- `POST /api/properties/[id]/utilities/suggest` — AI-suggest utility providers

### Modified Routes
- `GET /api/dashboard/stats` — Added optional ?propertyId= filter
- `GET /api/dashboard/spend-chart` — Added optional ?propertyId= filter
- `GET /api/requests` — Added optional ?propertyId= filter
- `GET/POST /api/properties` — Now accepts/returns apt_or_unit_no, rent_due_day
- `POST /api/properties/[id]/tenants` — Now accepts lease fields + custom_fields
- `PATCH /api/tenants/[id]` — Now accepts lease fields + custom_fields
- `POST/PATCH /api/vendors` — Now accepts priority_rank + custom_fields

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] All 9 new routes documented
3. [ ] All 7 modified routes documented
4. [ ] Consistent format with existing entries
