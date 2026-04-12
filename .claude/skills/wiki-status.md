---
name: wiki-status
description: Regenerate wiki/status.md from live state — features, tickets, roadmap, git log
user_invocable: true
---

# /wiki-status — Regenerate status.md

Fully regenerative. Every run overwrites `wiki/status.md` entirely. Idempotent.

## Live sources read

1. `features/roadmap.md` — current phase + feature statuses
2. `features/inprogress/**/doing/` — active tasks (filename = current task)
3. `features/inprogress/**/backlog/` — remaining task count per feature
4. `features/inprogress/**/done/` — completed task count per feature
5. `.claude/tickets.md` — tickets grouped by status
6. `.claude/feature-lifecycle.json` — branch + lifecycle state
7. Last 15 entries of `wiki/log.md` — recent `feature` / `deploy` / `migration` entries
8. `git log -n 10 --pretty=format:"%h %s"` — recent commits (signal only, no citation)

## Output structure

```markdown
# Project Status

**Date**: YYYY-MM-DD
**Branch**: <current-branch-from-lifecycle>

## Phase
<one paragraph summarizing current phase per roadmap>

## Features in flight
| Feature | Branch | Progress | Current task |
|---|---|---|---|
<rows from features/inprogress/**>

## Open tickets
<grouped by status: in-progress / open / testing / deployed / closed>

## Recently shipped
<last 5 log entries of type feature/deploy/migration>

## Next likely
<features in features/planned/ that are unblocked>

## Blockers
<any PIVOT.md present, lifecycle state = error, or open tickets in-progress >2 weeks>

---
_Generated YYYY-MM-DD HH:MM by /wiki-status_
```

## Log entry

Append to `wiki/log.md`:

```
## [YYYY-MM-DD] status-refresh | <one-line state summary>
- Features in flight: <count>
- Open tickets: <count>
- Triggered by: <skill or manual>
```

## Acceptance

- Regenerated `status.md` reflects current state of all sources.
- Footer timestamp present.
- Safe to run N times consecutively — same inputs produce same output.
- Never reads from or writes to `wiki/for-liz.md` or `wiki/qa-queue.md` — those are separate surfaces.

## Implementation notes

- Parse `.claude/tickets.md` markdown tables; group rows by Status column.
- Parse `features/inprogress/*/` directory listings for task counts.
- `git log` is read-only; commits never produced by this skill.
- If feature-lifecycle state is `error` or `pr_created`, surface that prominently in the Blockers section.
