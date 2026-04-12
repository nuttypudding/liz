---
type: concept
tags: [process, workflow, tickets, brightstep]
created: 2026-04-12
updated: 2026-04-12
confidence: high
---

# Ticket Lifecycle

Every feature and bug fix in Liz starts with a ticket in `.claude/tickets.md`. No work begins without one. This is the BrightStep ticket-first rule.

## Status Lifecycle

```
open → in-progress → testing → pr-open → deployed → closed
```

| Status | Meaning |
|--------|---------|
| `open` | Ticket logged, work not started |
| `in-progress` | Active development on a feature branch |
| `testing` | Implementation complete, undergoing QA |
| `pr-open` | PR created, awaiting merge |
| `deployed` | Merged to main and live in production |
| `closed` | Verified working in production, no further action |

## Ticket Categories

| Category | Use When | Deployment path |
|----------|----------|-----------------|
| `new-feature` | New functionality | PR-based deploy |
| `bug-fix-dev` | Bug only reproducible in local dev | Fix + test locally, no deploy |
| `bug-fix-prod` | Bug reproducible in production | Fix → test → PR → deploy → verify |

## Skills That Drive Transitions

- `/log-bug` — creates a `bug-fix-dev` or `bug-fix-prod` ticket (`open`)
- `/plan-feature` — creates a `new-feature` ticket and a branch (`open` → `in-progress`)
- `/fix-bug --ticket T-NNN` — links code work to an existing ticket (`in-progress`)
- `/ship` — runs tests and commits, effectively pushing toward `testing`
- `/merge-to-main` — pushes branch and creates PR (`pr-open`)
- `/deploy-prod` — deploys to Vercel (`deployed`)

## Ticket ID Format

Tickets are sequential integers prefixed with `T-` (e.g., `T-017`, `T-018`). IDs are never reused.

## Feature Naming and Ticket Relationship

Ticket-driven features (reactive work) use the `P{phase}-Tkt-{seq}-{name}` naming convention. Pre-planned roadmap features use `P{phase}-{seq}-{name}`. See [[decisions/2026-04-08-tkt-naming-convention]] for rationale.

## Related

- [[concepts/feature-branch-lifecycle]] — how branches map to tickets and tasks
- [[decisions/2026-04-01-adopt-brightstep-process]] — why ticket-first workflow was adopted
- [[project/workflow/brightstep-process]] — full BrightStep process reference
