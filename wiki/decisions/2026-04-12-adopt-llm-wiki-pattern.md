---
type: decision
tags: [wiki, knowledge-management, documentation, architecture]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Adopt LLM Wiki Pattern (P1-Tkt-002, T-018)

## Decision

Replace scattered `docs/`, `plan/`, and `intake/` synthesis with a persistent, Obsidian-compatible `wiki/` maintained by Claude. After migration, `docs/` and `plan/` are deleted (no stubs). `features/`, `.claude/tickets.md`, `.claude/skills/**`, and `CLAUDE.md` remain as live operational state; the wiki synthesizes from them.

## Rationale

Knowledge was previously re-derived per query with no compounding — Claude had to re-read source files every time rather than referencing a synthesized wiki page. Liz (product owner) had no self-serve surface to check project state. The wiki solves both problems: Claude builds on prior synthesis, and Liz reads `for-liz.md` and `qa-queue.md` for plain-language project status.

The three-audience model (Claude Code, developer, Liz) ensures the right level of detail reaches the right reader. qmd provides hybrid BM25/vector search across wiki pages. A Streamlit chat app gives Liz conversational access.

## Consequences

- `docs/` and `plan/` are deleted after migration completes (task 256).
- `wiki/WIKI.md` is the canonical schema reference for all wiki operations.
- All new documentation goes into the wiki, not into `docs/` or `plan/`.
- Log.md is append-only; index.md is maintained on every page creation.

## Related

- [[project/workflow/qmd-search]] — qmd search integration for the wiki
- [[decisions/2026-04-08-tkt-naming-convention]] — this feature is P1-Tkt-002
