---
type: decision
tags: [ai, utilities, product, database]
created: 2026-04-08
updated: 2026-04-08
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Hybrid AI + Manual for Utility Lookup (P1-007)

## Decision

Claude Haiku suggests utility providers by address; the landlord confirms or edits the suggestion. One row per utility type per property in `property_utilities` table. Account numbers are stored but never sent to AI or shown to tenants.

## Rationale

Utility provider data is not reliably available via a single API, and landlords often have local knowledge. A hybrid approach — AI suggests, human confirms — gives the best of both: faster entry than fully manual, more accurate than fully automated. Using Haiku (not Sonnet) keeps cost low for a simple address-to-provider lookup. Account numbers are sensitive; storing them in the DB while excluding them from AI context and tenant views is the correct privacy boundary.

## Consequences

- `property_utilities` table has one row per (property, utility_type) combination.
- AI suggestion is a starting point, not a committed value — landlord must confirm.
- Account numbers use column-level access control to prevent exposure to tenants or AI prompts.

## Related

- [[decisions/2026-04-08-product-owner-feedback-four-new-p1-features]] — feedback session this came from
- [[project/system-architecture]] — data model and AI integration points
