---
id: 268
title: Retarget /update-docs to wiki/project
tier: Sonnet
depends_on: [256, 267]
feature: llm-wiki
---

# 268 — Retarget /update-docs to wiki/project

## Objective
Update `.claude/skills/update-docs.md` so it scans for changes and updates pages under `wiki/project/**` instead of `docs/**`.

## Implementation
1. Read current `.claude/skills/update-docs.md`.
2. Replace every occurrence of `docs/` with `wiki/project/`.
3. Extend scope: when the change introduces new domain concepts (not just operational reference), suggest creating or updating a `wiki/concepts/**` page — but don't auto-create, ask.
4. Add a final step: append `wiki/log.md` with `## [YYYY-MM-DD] docs-update | <summary>`.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] No `docs/` references remain in the skill
3. [ ] Skill touches `wiki/project/**` successfully on a dry-run change
4. [ ] Log entry appended on completion
