---
id: 042
title: Rent payment recording API — POST /api/properties/[id]/rent-payments
tier: Sonnet
depends_on: [25, 26]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 042 — Rent Payment Recording API

## Objective

Build the POST `/api/properties/[id]/rent-payments` endpoint for landlords to manually record rent payments.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Rent Payment Entry" section. Manual entry for MVP; Stripe integration deferred to P2-004.

## Implementation

Create `apps/web/app/api/properties/[id]/rent-payments/route.ts`:

1. Auth check (landlord only)
2. Validate body with `rentPaymentSchema` (from task 026)
3. Insert into `rent_payments` table
4. Return created record

Request body: `{ amount, paid_at, period_start, period_end, tenant_id?, notes? }`

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] POST creates a rent payment record
3. [ ] Zod validation applied
4. [ ] Auth check: landlord only
5. [ ] Returns created record with id
6. [ ] Invalid data returns 400 with error message
