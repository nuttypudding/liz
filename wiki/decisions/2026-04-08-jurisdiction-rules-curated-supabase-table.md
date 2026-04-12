---
type: decision
tags: [legal, compliance, database, ai]
created: 2026-04-08
updated: 2026-04-08
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Jurisdiction Rules as Curated Supabase Table (P3-003)

## Decision

Legal jurisdiction rules are stored as curated rows in a Supabase table, not generated at runtime by AI. AI is used for communication review and notice personalization, not rule generation.

## Rationale

AI-generated legal rules at runtime would be unacceptably unreliable — errors could expose landlords to legal liability. Curated rules, maintained by humans and versioned in the database, are auditable and correctable. AI is well-suited for personalizing the language of tenant notices within the bounds of curated rules, but should not determine what the rules are.

## Consequences

- A human curation process is required to maintain jurisdiction rules.
- Rules are keyed by state/city and versioned; stale rules must be flagged for review.
- AI notice generation always operates within the constraints of the fetched jurisdiction rules.

## Related

- [[decisions/2026-04-01-mvp-scope-core-four]] — legal compliance is Phase 3, not MVP
- [[project/system-architecture]] — how the jurisdiction rules table fits in the data model
