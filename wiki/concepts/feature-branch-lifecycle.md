---
type: concept
tags: [process, workflow, git, brightstep, feature-branch]
created: 2026-04-12
updated: 2026-04-12
confidence: high
---

# Feature Branch Lifecycle

Each feature in Liz runs on a dedicated Git branch. State is tracked in `.claude/feature-lifecycle.json`. The automated runner (`autonextstep.py`) manages the full lifecycle from task execution through PR merge.

## Branch Naming

| Convention | Pattern | Example |
|------------|---------|---------|
| Pre-planned feature | `feature/<P{phase}-{seq}-{name}>` | `feature/P2-002-auto-scheduling-vendors` |
| Ticket-driven feature | `feature/<P{phase}-Tkt-{seq}-{name}>` | `feature/P1-Tkt-001-mvp-ux-overhaul` |
| Bug fix | `fix/<T-NNN-name>` | `fix/T-017-clerk-role-null` |

## State Machine

```
in_progress → pr_created → merged
                              ↓
                         (next feature starts)
      error ←──────────────────────────────────
```

| State | Meaning |
|-------|---------|
| `in_progress` | Feature tasks are running on the feature branch |
| `pr_created` | All tasks done; PR is open awaiting merge |
| `merged` | PR merged to main; branch retired |
| `error` | Merge failed; needs manual intervention |

## Feature Directory Layout

Each active feature lives under `features/inprogress/<feature>/` with `README.md`, `backlog/`, `doing/` (max 1 task), and `done/` subdirectories. Tasks move `backlog/` → `doing/` → `done/` as work progresses.

## Auto-Merge vs. Manual Review

By default, `autonextstep.py` merges the PR automatically. Pass `--no-auto-merge` to pause in `pr_created` state for manual review before merge.

## Feature Plan Lifecycle

`features/planned/` → `features/inprogress/` → `features/completed/`. A feature moves to `inprogress/` when its first task starts and to `completed/` after the PR merges.

## Related

- [[concepts/ticket-lifecycle]] — tickets that initiate features
- [[concepts/model-tier-system]] — how task files are named within a feature
- [[decisions/2026-04-01-adopt-brightstep-process]] — BrightStep process that defines this lifecycle
