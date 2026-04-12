---
id: 271
title: Hook /ship to wiki + qa-refresh
tier: Sonnet
depends_on: [266, 267, 268]
feature: llm-wiki
---

# 271 — Hook /ship to wiki + qa-refresh

## Objective
`/ship` targets `wiki/project/**` for its doc sweep (via `/update-docs`) and refreshes `qa-queue.md` when a ticket transitions to `testing`.

## Implementation
1. Read `.claude/skills/ship.md`.
2. The doc-sweep step should already delegate to `/update-docs` (now retargeted in task 268). Verify no hardcoded `docs/` paths remain in `ship.md` itself.
3. Add a step at the end: if the commit causes any ticket in `.claude/tickets.md` to transition to `testing` or `deployed`, invoke `/wiki-qa-refresh`.
4. Append `wiki/log.md`: `## [YYYY-MM-DD] ship | <commit-subject>` with 1-line summary.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] No `docs/` references in `ship.md`
3. [ ] Ticket status transitions trigger `/wiki-qa-refresh`
4. [ ] Every successful `/ship` appends one log entry
