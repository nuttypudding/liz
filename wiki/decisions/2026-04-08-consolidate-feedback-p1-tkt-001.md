---
type: decision
tags: [process, planning, phase-1, product]
created: 2026-04-08
updated: 2026-04-08
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Consolidate Liz's Feedback into P1-Tkt-001-mvp-ux-overhaul

## Decision

Features P1-004 through P1-007 and bug T-011 are merged into a single feature, `P1-Tkt-001-mvp-ux-overhaul` (ticket T-016).

## Rationale

All five items (onboarding UX refinements, property-centric dashboard, lease management, utility integration, slider bug) originated from the same product review session. Keeping them together under one feature reduces ticket overhead, makes it easier to plan a coherent sprint, and avoids the cognitive overhead of switching between five separate feature contexts. The `Tkt` naming convention signals these are reactive, not pre-planned.

## Consequences

- T-016 is the canonical ticket for this work.
- P1-004 through P1-007 are not tracked as separate features — they are sub-tasks within `P1-Tkt-001`.
- Future product review sessions should follow the same pattern: group feedback by session into one `Tkt` feature.

## Related

- [[decisions/2026-04-08-tkt-naming-convention]] — the naming convention used for this feature
- [[decisions/2026-04-08-product-owner-feedback-four-new-p1-features]] — the feedback items being consolidated
