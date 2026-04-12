---
id: 265
title: Create /wiki-status skill
tier: Sonnet
depends_on: [261]
feature: llm-wiki
---

# 265 — Create /wiki-status skill

## Objective
Write `.claude/skills/wiki-status.md` — regenerate `wiki/status.md` from live state.

## Implementation
The skill reads these live sources:
1. `features/roadmap.md` — current phase + feature statuses
2. `features/inprogress/**/doing/` — active tasks
3. `features/inprogress/**/backlog/` — remaining tasks (count only)
4. `.claude/tickets.md` — open/in-progress/testing tickets
5. `wiki/log.md` — last N entries of type `feature` / `deploy` / `migration`
6. `git log -n 10 --pretty=format:"%h %s"` — recent commits (signal, not citation)

Writes `wiki/status.md` with these sections:
- **Date + branch** (current git branch)
- **Phase** — from roadmap
- **Features in flight** — one row per feature with: branch, % tasks done, task in `doing/` if any
- **Open tickets** — grouped by status
- **Recently shipped** — last 5 `feature`/`deploy` log entries
- **Next likely** — features in `planned/` that are unblocked

Must be fully regenerative — every run overwrites `status.md` entirely. Include a "Generated YYYY-MM-DD HH:MM by /wiki-status" footer.

Append a log entry: `## [YYYY-MM-DD] status-refresh | <summary>`.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] `.claude/skills/wiki-status.md` exists
3. [ ] Skill is idempotent (safe to run N times in a row)
4. [ ] Regenerated `status.md` reflects current state of all live sources
5. [ ] Footer timestamp present
6. [ ] Skill registered in CLAUDE.md (task 267)
