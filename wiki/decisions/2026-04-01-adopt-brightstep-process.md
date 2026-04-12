---
type: decision
tags: [process, workflow, development]
created: 2026-04-01
updated: 2026-04-01
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Adopt BrightStep Development Process

## Decision

Adopt the BrightStep development process as the project's standard workflow.

## Rationale

BrightStep provides a ticket-first workflow that prevents ad-hoc work from accumulating without traceability. The model tier system (Haiku/Sonnet/Opus) controls AI cost by matching task complexity to model capability. The automated task runner (`autonextstep.py`) allows unattended feature execution. Structured feature planning with `backlog/`, `doing/`, `done/` directories makes task state visible and machine-readable.

## Consequences

- All work requires a ticket in `.claude/tickets.md` before starting.
- Task filenames encode the required model tier.
- Feature branches follow the `feature/<name>` naming convention.
- The process is self-contained in `brightstep_process/` and can be exported to other projects.

## Related

- [[project/workflow/brightstep-process]] — full BrightStep process reference
- [[project/workflow/brightstep-readme]] — process overview
