---
id: 249
title: Create wiki path-scoped rule
tier: Haiku
depends_on: [248]
feature: llm-wiki
---

# 249 — Create wiki path-scoped rule

## Objective
Create `.claude/rules/wiki.md` so Claude auto-loads `WIKI.md` guidance whenever it edits `wiki/**`.

## Context
Follows the existing pattern of `.claude/rules/documentation.md`, `plan-changes.md`, `task-execution.md`. Path-scoped rules fire automatically based on file paths being edited.

## Implementation
1. Read `.claude/rules/documentation.md` for format reference.
2. Create `.claude/rules/wiki.md`:
   - Scope: applies when editing `wiki/**`
   - Body: brief pointer to `wiki/WIKI.md` as the authoritative schema, plus 3–5 high-leverage reminders (every non-obvious claim needs a `[[sources/...]]` citation; update `index.md` when creating pages; append `log.md` for ingest/lint/query; honor frontmatter schema; keep plain-language surface limited to `for-liz.md` and `qa-queue.md`).
3. Reference the new rule in `CLAUDE.md` under "Rules (auto-loaded by file path)" table.

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] `.claude/rules/wiki.md` exists and points to `wiki/WIKI.md`
3. [ ] `CLAUDE.md` rules table includes the new row
4. [ ] Rule is short (under 30 lines) — schema lives in WIKI.md, not here
