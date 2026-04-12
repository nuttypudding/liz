---
type: decision
tags: [process, naming, workflow, conventions]
created: 2026-04-08
updated: 2026-04-08
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# New Naming Convention: `P{phase}-Tkt-{seq}-{name}`

## Decision

Introduce the `P{phase}-Tkt-{seq}-{name}` naming convention for ticket-driven work within an existing phase. Pre-planned roadmap features use `P{phase}-{seq}-{name}`.

## Rationale

The existing `P{phase}-{seq}` naming does not distinguish between features that were planned upfront on the roadmap and features that emerge reactively from bug reports, product feedback, or enhancements. The `Tkt` infix makes the origin explicit: these features are driven by tickets/feedback after the initial phase plans were set. This distinction helps with retrospectives, roadmap communication, and understanding feature provenance.

## Consequences

- All reactive work within a phase uses the `Tkt` naming (e.g., `P1-Tkt-001`, `P1-Tkt-002`).
- Pre-planned roadmap features continue to use sequential numbering (e.g., `P1-001`, `P2-001`).
- The CLAUDE.md feature naming table is updated to document both conventions.

## Related

- [[decisions/2026-04-08-consolidate-feedback-p1-tkt-001]] — first use of this convention
- [[project/workflow/brightstep-process]] — feature naming is part of the BrightStep workflow
