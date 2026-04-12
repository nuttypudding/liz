---
id: 260
title: Synthesize workflow concepts from brightstep
tier: Sonnet
depends_on: [252]
feature: llm-wiki
---

# 260 — Synthesize workflow concepts from brightstep

## Objective
Migrate `brightstep_process/**` into `wiki/project/workflow/` as structured reference, plus synthesize 2–3 cross-cutting concept pages.

## Implementation
1. For each file in `brightstep_process/`, create a counterpart in `wiki/project/workflow/` with `type: project` frontmatter.
2. Create these `type: concept` pages synthesizing across the process docs:
   - `wiki/concepts/brightstep-process.md` — high-level: ticket-first, plan-feature, task files, tiers, autorunner. One-page overview.
   - `wiki/concepts/skills-catalog.md` — generated from the skill table in CLAUDE.md. One row per skill with status, purpose, and what it touches. Auto-refresh candidate (note this in the page).
3. Add a new decision page `wiki/decisions/2026-04-12-brightstep-adoption.md` if it's not already captured from the DECISION_LOG migration.
4. DO NOT delete `brightstep_process/` in this task — add it to a follow-up cleanup task (or include in task 256 if agreed). For safety, leave it for now.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] `wiki/project/workflow/` mirrors `brightstep_process/` contents
3. [ ] 2 new concept pages exist
4. [ ] Links between concept pages and workflow reference resolve
