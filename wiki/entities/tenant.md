---
type: entity
tags: [tenant, persona, maintenance, intake]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: medium
---

# Tenant

The indirect user of Liz. Tenants interact with Liz through the maintenance intake surface, not as account holders. They submit requests, receive automated troubleshooting guides, and are notified when a work order is dispatched. They do not log in to the Liz dashboard.

## Role in the System

Tenants are the origin of all maintenance events. Their submitted messages — text and optional photos — are the raw input for the Gatekeeper and Estimator. They are represented in the database as rows in the `tenants` table, linked to properties, with optional lease fields stored directly on that table per [[decisions/2026-04-08-lease-fields-on-tenants-table]].

## Intake Flow (Tenant Side)

1. Tenant submits a maintenance request (text + optional photo)
2. Liz's Gatekeeper runs a "Need vs. Want" filter and sends troubleshooting guides where applicable (e.g., "Check the breaker" for power issues) — this deflects ~20% of tickets before a work order is created
3. If the issue persists, Liz classifies category and urgency, generates a cost estimate via Estimator, and drafts a work order via Matchmaker
4. Landlord approves the work order; tenant is notified when the vendor is assigned

## Categorization

Tenant submissions are classified into seven maintenance categories:

| Category | Examples |
|----------|---------|
| plumbing | leaky faucet, pipe burst, clog |
| electrical | outlet failure, breaker trip |
| hvac | no heat, AC failure |
| structural | roof damage, wall crack |
| pest | rodents, cockroaches |
| appliance | broken dishwasher, oven malfunction |
| general | cosmetic, minor repairs |

Urgency is classified as `low`, `medium`, or `emergency`. Safety hazards (flooding, gas leak, no heat in winter) are always emergency. Classification logic is defined in [[decisions/2026-04-01-mvp-scope-core-four]].

## Escalation Triggers

Certain cases always route to the landlord for manual handling, regardless of delegation mode:
- Legal risk: mold, no heat, flooding
- High estimated cost (above landlord's auto-approve threshold)
- Repeated issue on the same unit
- AI confidence score below threshold

This escalation logic was described in [[decisions/2026-04-08-hybrid-ai-manual-utility-lookup]] (utility context) and reinforced in `inbox/liz msg.md` (product owner voice).

## Tenant Data Stored

- Name, contact info (phone/email)
- Unit association
- Lease start/end dates, monthly rent (on `tenants` table, not a separate leases table)
- Maintenance ticket history per unit

## Related

- [[decisions/2026-04-08-lease-fields-on-tenants-table]] — why lease fields live on the tenants table
- [[decisions/2026-04-01-mvp-scope-core-four]] — defines the Gatekeeper feature that processes tenant input
- [[concepts/the-core-four]] — product architecture tenant requests flow through
- [[project/system-architecture]] — database schema for tenants and maintenance_tickets
