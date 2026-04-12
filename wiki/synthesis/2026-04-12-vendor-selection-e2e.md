---
type: synthesis
tags: [vendor, matchmaker, dispatch, end-to-end, mvp]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# Vendor Selection End-to-End (Phase 1 MVP → Phase 2)

Synthesized answer to "How does Liz handle vendor selection end-to-end?" Draws from the Matchmaker pillar of the Core Four, the vendor entity, and four decision pages.

## Phase 1 (shipped)

1. **Classification**: A tenant message + photos enters Liz's AI intake (Gatekeeper). The result is a `category` (plumbing, electrical, hvac, etc.) and `urgency` ([[concepts/urgency-triage]], [[concepts/maintenance-category-taxonomy]]).
2. **Filter**: The Matchmaker — pillar 3 of [[concepts/the-core-four]] — filters the landlord's `vendors` table by `trade` matching the classified category ([[entities/vendor]]).
3. **Rank**: Vendors are ordered by the landlord's `preferred` flag and `priority_rank` values, which live on the vendor row itself rather than in a separate join table ([[decisions/2026-04-06-landlord-decision-profile-separate-table]]).
4. **Draft work order**: Liz composes a work order draft: property address, tenant contact, issue description, photos, and estimator cost range. Nothing is sent yet.
5. **Landlord approval**: The landlord reviews the draft and clicks "Approve & Send". Per [[decisions/2026-04-06-auto-delegation-mode-disabled-mvp]], this approval gate is never bypassed in the MVP — the "Auto" mode is visible but disabled.
6. **Dispatch (DB-only)**: On approval, the work order is persisted to the `work_orders` table. **No automated SMS or email is sent to the vendor** ([[decisions/2026-04-01-vendor-dispatch-db-only-mvp]]) — the landlord picks up the phone or copies the details manually.

## Inputs to ordering

Beyond the `preferred`/`priority_rank` vendor attributes, three landlord-level signals are intended to shape vendor selection:

- **Risk appetite** — cost-first, speed-first, or balanced. Captured at onboarding and stored in the landlord decision profile ([[entities/landlord]]).
- **Preferred vendor presence** — if a preferred vendor exists for the trade, it ranks first unless the landlord is speed-first and a faster vendor exists.
- **Past performance** — reserved for Phase 2+; requires maintenance ticket history aggregation.

## Phase 2 (planned)

One-click dispatch lands in Phase 2. Twilio SMS notifies the vendor with the work order details; Resend handles email for longer-form communications ([[decisions/2026-04-08-resend-twilio-notifications]]). The `work_orders` schema already supports this, so the Phase 2 change is wiring, not migration.

Auto-scheduling across tenant and vendor availability is a sibling Phase 2 feature (T-005 — Auto-scheduling Vendors) that consumes the same dispatch pipeline.

## What's intentionally out of scope

- Automatic vendor selection without landlord approval (deferred past Phase 3 pending autonomous decision-making — T-008).
- Payment to vendors (Phase 2 payment integration — T-007).
- Vendor-side mobile app or portal (not planned; vendors remain external contacts).

## Related

- [[concepts/the-core-four]] — product architecture
- [[entities/vendor]] — data model
- [[entities/landlord]] — approval authority and decision profile
- [[decisions/2026-04-01-vendor-dispatch-db-only-mvp]]
- [[decisions/2026-04-01-mvp-scope-core-four]]
- [[decisions/2026-04-08-resend-twilio-notifications]]
- [[decisions/2026-04-06-landlord-decision-profile-separate-table]]
- [[decisions/2026-04-06-auto-delegation-mode-disabled-mvp]]
