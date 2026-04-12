---
id: 272
title: Hook /deploy-prod to qa-refresh
tier: Sonnet
depends_on: [266, 267]
feature: llm-wiki
---

# 272 — Hook /deploy-prod to qa-refresh

## Objective
After a successful production deploy, mark relevant tickets `deployed` and refresh `qa-queue.md` with the prod URL.

## Implementation
1. Read `.claude/skills/deploy-prod.md`.
2. After successful Vercel deploy:
   - Identify tickets associated with the deployed commits (via branch name or commit messages referencing `T-NNN`).
   - Update each from `pr-open`/`testing` → `deployed` in `.claude/tickets.md`.
   - Invoke `/wiki-qa-refresh`.
3. Append `wiki/log.md`: `## [YYYY-MM-DD] deploy | <prod-url>` with tickets deployed.
4. Also update `wiki/status.md` via `/wiki-status` — a prod deploy is meaningful project state.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] Tickets auto-transition on successful deploy
3. [ ] `/wiki-qa-refresh` called after deploy
4. [ ] `/wiki-status` called after deploy
5. [ ] Deploy log entry present
