---
type: decision
tags: [database, schema, lease, tenants]
created: 2026-04-08
updated: 2026-04-08
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Lease Fields on Tenants Table, Not Separate Leases Table (P1-006)

## Decision

Lease data (start date, end date, rent amount, etc.) is stored as columns on the `tenants` table, not in a separate `leases` table.

## Rationale

MVP targets landlords with 1–20 units who have one active lease per tenant at any time. A separate `leases` table with a foreign key relationship would be over-engineering for this scale. Adding columns to `tenants` is simpler, requires fewer joins, and is easy to migrate later if multi-lease history becomes necessary.

## Consequences

- Only one active lease per tenant is supported in MVP.
- Historical lease data is not retained when a tenant's lease is updated.
- Future migration to a separate `leases` table is possible but will require a data migration.

## Related

- [[decisions/2026-04-08-product-owner-feedback-four-new-p1-features]] — feedback session this came from
- [[project/system-architecture]] — data model overview
