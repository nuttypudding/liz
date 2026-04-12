---
type: decision
tags: [product, mvp, automation, safety]
created: 2026-04-06
updated: 2026-04-06
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# "Auto" Delegation Mode Disabled for MVP

## Decision

The "Auto" delegation mode is shown in the UI but marked "Coming soon." Autonomous vendor dispatch is deferred to Phase 2/3.

## Rationale

Full autonomous dispatch requires an escalation layer, spending limits, and safety rails that are out of scope for MVP. Shipping a visible but disabled toggle communicates the product roadmap to early users without requiring the underlying safety infrastructure. The MVP principle is: AI assists, never acts autonomously without landlord approval.

## Consequences

- All work orders in MVP require landlord confirmation before dispatch.
- The UI shows the delegation mode option to set user expectations about future functionality.
- Phase 2/3 implementation must include spending limits and escalation handling before enabling.

## Related

- [[decisions/2026-04-01-mvp-scope-core-four]] — overall MVP scope definition
- [[project/ux-plan-intake-mvp]] — UX context for landlord approval flow
