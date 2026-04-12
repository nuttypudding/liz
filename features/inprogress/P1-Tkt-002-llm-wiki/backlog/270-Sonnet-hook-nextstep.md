---
id: 270
title: Hook /nextstep to log + status refresh
tier: Sonnet
depends_on: [265, 267]
feature: llm-wiki
---

# 270 — Hook /nextstep to log + status refresh

## Objective
On task completion, `/nextstep` appends to `wiki/log.md` and calls `/wiki-status` when a feature completes.

## Implementation
1. Read current `.claude/skills/nextstep.md` and `.claude/commands/nextstep.md`.
2. At task-completion point:
   - Append to `wiki/log.md`: `## [YYYY-MM-DD] task-done | <task-id> — <task-title>` with 1-line summary.
3. At feature-completion point (last task moves to `done/`):
   - Append `## [YYYY-MM-DD] feature-done | <feature-name>`
   - Invoke `/wiki-status` to regenerate `status.md`
4. Consider performance: if the autorunner runs many tasks back-to-back, `status.md` regeneration per task is wasteful. Debounce: only call `/wiki-status` on feature completion, not per task. Per-task only gets the log append.
5. Check `scripts/autonextstep.py` — if `/nextstep` is invoked programmatically there, confirm the hook still fires.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] Every task completion produces a `task-done` log entry
3. [ ] Feature completion additionally triggers `/wiki-status`
4. [ ] No per-task `/wiki-status` calls (debounce honored)
5. [ ] Autorunner compatibility verified
