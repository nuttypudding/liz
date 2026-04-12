---
type: concept
tags: [process, workflow, development]
created: 2026-04-12
updated: 2026-04-12
confidence: high
---

# BrightStep Process

BrightStep is the ticket-first development methodology used to build Liz. Every piece of work — feature, bug fix, or infrastructure change — flows through the same five stages: ticket, plan, tasks, execution, and ship.

## Pillars

**Ticket-first.** No work starts without a row in `.claude/tickets.md`. Tickets have a category (`new-feature`, `bug-fix-dev`, `bug-fix-prod`), a status (`open` → `in-progress` → `testing` → `pr-open` → `deployed` → `closed`), and an associated branch. See [[concepts/ticket-lifecycle]].

**Plan before tasks.** `/plan-feature <name>` produces a feature plan README under `features/planned/P{phase}-{seq}-{name}/`. The plan captures summary, user stories, architecture, data model, integration points, and a manual testing checklist. Opus-tier judgment goes into the plan so Sonnet/Haiku can execute the tasks.

**Tasks per file, tier-encoded.** `/create-feature-tasks-in-backlog` splits the plan into numbered markdown task files under `backlog/`. Filenames carry the tier prefix (`247-Haiku-…`, `248-Opus-…`) so the autorunner routes each to the cheapest sufficient model. See [[concepts/model-tier-system]].

**One branch per feature.** Each feature runs on a dedicated `feature/<name>` branch that merges to main via PR only after the last task completes. Lifecycle state is tracked in `.claude/feature-lifecycle.json`. See [[concepts/feature-branch-lifecycle]].

**Automated task runner.** `scripts/autonextstep.py` walks `features/inprogress/*/backlog/`, picks the lowest-numbered ready task, runs it at the correct tier, moves it through `doing/` → `done/`, commits, and repeats until the feature completes.

## Flow

```
/plan-feature → README + ticket + branch
      ↓
/create-feature-tasks-in-backlog → NNN-Tier-title.md files
      ↓
/nextstep  (or autorunner)
      ↓
backlog/ → doing/ → done/ → commit → push
      ↓ (last task)
merge PR → main
```

## Where to look

- Full reference: [[project/workflow/brightstep-process]] (migrated from `brightstep_process/PROCESS.md`)
- Skill catalog: [[concepts/skills-catalog]]
- Adoption rationale: [[decisions/2026-04-01-adopt-brightstep-process]]
- Task-execution conventions: `.claude/rules/task-execution.md`

## Why it works for Liz

Small-team product with LLM-in-the-loop execution. The ticket-first gate prevents drift. The tier system controls cost. Per-feature branches keep main shippable. The autorunner runs overnight without supervision. Nothing about this is Liz-specific — the full process is exported in [[project/workflow/brightstep-readme]] for reuse.
