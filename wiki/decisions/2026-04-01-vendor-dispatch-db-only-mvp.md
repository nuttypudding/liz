---
type: decision
tags: [vendor, notifications, mvp, scope]
created: 2026-04-01
updated: 2026-04-01
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Vendor Dispatch Is DB-Only for MVP

## Decision

Work orders are saved to the database only in MVP. No SMS or email is sent to vendors in v1. Twilio integration is deferred to Phase 2.

## Rationale

Adding Twilio requires credentials, compliance considerations, and error handling that would increase MVP complexity without validating the core product loop. The most important thing for MVP is proving that the Gatekeeper and Matchmaker logic works correctly. Vendors can be contacted manually by the landlord using the work order data from the Ledger.

## Consequences

- Vendors do not receive automated notifications in Phase 1.
- Landlords must manually communicate work orders to vendors.
- Twilio setup is planned for Phase 2 alongside the broader notification system (Resend + Twilio).

## Related

- [[decisions/2026-04-08-resend-twilio-notifications]] — Phase 2 notification decision
- [[project/system-architecture]] — data flow for vendor dispatch
