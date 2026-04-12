---
id: 251
title: Generate migration manifest
tier: Sonnet
depends_on: [248]
feature: llm-wiki
---

# 251 — Generate migration manifest

## Objective
Produce `wiki/raw/_migration_manifest.md` — a classification table of every markdown file currently in the repo, mapping each to its future home in the wiki (or marking it `skip`).

## Context
Manifest drives Phase C (migrate) and Phase D (synthesize). Getting the classification right once avoids re-work.

## Implementation
1. Enumerate every `.md` file in the repo EXCLUDING: `.claude/skills/**`, `.claude/commands/**`, `.claude/rules/**`, `.claude/tickets.md`, `CLAUDE.md`, `features/**`, `wiki/**`, `node_modules/**`. (These are either live-state or already in the wiki.)
2. For each file, classify into one of:
   - `project` → destination under `wiki/project/**`
   - `decision` → destination under `wiki/decisions/**`
   - `entity` → destination under `wiki/entities/**`
   - `concept` → destination under `wiki/concepts/**`
   - `source` → destination under `wiki/sources/**` with raw in `wiki/raw/`
   - `skip` → with reason
3. Write `wiki/raw/_migration_manifest.md` as a markdown table:
   | Source path | Classification | Destination | Notes |
   Plus a short summary at top (counts per class) and an "Open questions" section for ambiguous cases.
4. Expected coverage: `docs/**` → mostly `project`. `plan/**` → `decision` (split DECISION_LOG into per-decision pages). `intake/readme.md` → split into `concept` (The Core Four, categories) + `entity` (personas). `intake/samples/**/*.md` → `source`. `brightstep_process/**` → `project/workflow/`.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] Manifest exists at `wiki/raw/_migration_manifest.md`
3. [ ] Every `.md` file in scope appears exactly once
4. [ ] Counts at top match row counts
5. [ ] Ambiguous cases flagged in "Open questions"
6. [ ] DOES NOT actually move any files — manifest only
