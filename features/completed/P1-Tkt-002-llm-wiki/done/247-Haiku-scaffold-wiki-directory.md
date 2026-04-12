---
id: 247
title: Scaffold wiki/ directory skeleton
tier: Haiku
depends_on: []
feature: llm-wiki
---

# 247 — Scaffold wiki/ directory skeleton

## Objective
Create the empty `wiki/` directory tree so subsequent tasks have a place to write.

## Context
See feature plan `features/inprogress/P1-Tkt-002-llm-wiki/README.md` § Directory layout.

## Implementation
1. Create the following directories (with `.gitkeep` files where empty):
   ```
   wiki/
   wiki/raw/
   wiki/raw/assets/
   wiki/sources/
   wiki/entities/
   wiki/concepts/
   wiki/synthesis/
   wiki/decisions/
   wiki/project/
   wiki/project/testing/
   wiki/project/testing/testing-guides/
   wiki/project/workflow/
   ```
2. Create placeholder files (empty with H1 only): `wiki/index.md`, `wiki/log.md`, `wiki/status.md`, `wiki/for-liz.md`, `wiki/qa-queue.md`. Do NOT create `WIKI.md` — task 248 owns it.
3. Add `wiki/raw/assets/` to `.gitattributes` if needed for binary files (images).

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] All directories exist and are tracked by git (via `.gitkeep`)
3. [ ] Placeholder root files exist with just an H1 heading
4. [ ] `git status` shows the full tree added
