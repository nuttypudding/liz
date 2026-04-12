---
type: decision
tags: [database, schema, landlord-profile]
created: 2026-04-06
updated: 2026-04-06
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Landlord Decision Profile as Separate Table

## Decision

Store landlord profile data in a dedicated `landlord_profiles` table (1:1 with Clerk user) rather than adding columns to a non-existent users table. Vendor preferences use `preferred` and `priority_rank` columns on the existing `vendors` table.

## Rationale

A separate `landlord_profiles` table keeps profile data clean and queryable without polluting a generic users table. Since Clerk owns auth, there is no native Supabase users table to extend — creating `landlord_profiles` as a Clerk-user-ID-keyed table is the natural fit. Vendor preferences co-locate with vendor records rather than creating a separate join table, which would be over-engineering at MVP scale.

## Consequences

- `landlord_profiles` is the canonical source of landlord-specific settings (preferred vendors, delegation mode, etc.).
- Profile existence check gates the onboarding redirect (see the onboarding redirect decision).
- Multi-landlord queries join `landlord_profiles` on Clerk user ID.

## Related

- [[decisions/2026-04-06-onboarding-redirect-gated-wizard]] — uses profile existence to trigger onboarding
- [[project/system-architecture]] — data model overview
