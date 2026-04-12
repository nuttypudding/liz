---
type: entity
tags: [vendor, matchmaker, dispatch, maintenance]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# Vendor

A contractor or service provider in the landlord's network. Vendors are not Liz account holders — they are entries in the landlord's vendor list, used by the Matchmaker to draft and (eventually) dispatch work orders.

## Role in the System

Vendors are the output destination for maintenance workflows. Once a tenant submits a request and the landlord approves a work order, the vendor receives the job details: the tenant's issue, photos, property address, and contact information. In Phase 1, this is DB-only — no automated SMS or email is sent to vendors per [[decisions/2026-04-01-vendor-dispatch-db-only-mvp]]. The landlord manually contacts the vendor using the work order data.

## Vendor Data Model

Vendors are stored in the `vendors` table in Supabase. Key fields:

| Field | Description |
|-------|-------------|
| name | Business or contractor name |
| trade | Specialty (plumbing, electrical, hvac, general, etc.) |
| phone / email | Contact details for landlord to use manually in MVP |
| preferred | Boolean — landlord's preferred vendor for this trade |
| priority_rank | Ordering within a trade category |

Vendor preferences (preferred flag, priority rank) co-locate with vendor records rather than a separate join table. This was decided in [[decisions/2026-04-06-landlord-decision-profile-separate-table]].

## Matchmaker Feature

The Matchmaker is the third pillar of "The Core Four" per [[decisions/2026-04-01-mvp-scope-core-four]]. When a ticket is classified and estimated:

1. Liz filters available vendors by trade matching the maintenance category
2. The landlord's `preferred` and `priority_rank` settings influence ordering
3. Liz drafts a work order (property address, issue description, tenant contact, cost estimate range)
4. Landlord reviews the draft and clicks "Approve & Send"
5. In MVP: work order saved to DB only; landlord contacts vendor manually
6. Phase 2+: one-click dispatch via Twilio SMS per [[decisions/2026-04-08-resend-twilio-notifications]]

## Vendor Selection Inputs

Per the product owner's design in `inbox/liz msg.md`, vendor selection is influenced by:
- Landlord's risk appetite (cost-first → cheapest vendor; speed-first → fastest response time)
- Whether a preferred vendor exists for the relevant trade
- Past performance history (Phase 2+ feature — stored via maintenance ticket history)

## Phase 2: Automated Dispatch

Twilio SMS integration for vendor notifications is planned for Phase 2 alongside auto-scheduling. The `work_orders` table already has the schema to support this. See [[decisions/2026-04-08-resend-twilio-notifications]] for the Resend + Twilio notification architecture decision.

## Related

- [[decisions/2026-04-01-vendor-dispatch-db-only-mvp]] — DB-only dispatch in Phase 1
- [[decisions/2026-04-06-landlord-decision-profile-separate-table]] — vendor preferences stored on vendors table
- [[decisions/2026-04-08-resend-twilio-notifications]] — Phase 2 automated vendor notifications
- [[decisions/2026-04-01-mvp-scope-core-four]] — Matchmaker is one of the Core Four
- [[concepts/the-core-four]] — product architecture context
