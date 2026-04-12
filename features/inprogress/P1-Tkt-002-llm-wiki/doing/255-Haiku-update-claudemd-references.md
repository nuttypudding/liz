---
id: 255
title: Update CLAUDE.md references
tier: Haiku
depends_on: [253, 254]
feature: llm-wiki
---

# 255 — Update CLAUDE.md references

## Objective
Replace every `docs/` and `plan/` reference in `CLAUDE.md` (and any other live files) with the new `wiki/**` equivalents.

## Context
`CLAUDE.md` currently points to `docs/endpoints.md`, `docs/testing-framework.md`, `plan/DECISION_LOG.md`, etc. After migration these paths are stale.

## Implementation
1. Grep repo for `docs/` and `plan/` path references outside of `docs/**`, `plan/**`, `wiki/**`, `features/**`, `node_modules/**`, `.git/**`:
   ```
   rg '\bdocs/' --glob '!docs/**' --glob '!wiki/**' --glob '!features/**' --glob '!node_modules/**'
   rg '\bplan/' --glob '!plan/**' --glob '!wiki/**' --glob '!features/**' --glob '!node_modules/**'
   ```
2. Update each hit:
   - `docs/endpoints.md` → `wiki/project/endpoints.md`
   - `docs/testing-framework.md` → `wiki/project/testing/testing-framework.md`
   - `docs/testing-guides/` → `wiki/project/testing/testing-guides/`
   - `docs/ui-process.md` → `wiki/project/ui-process.md`
   - `plan/DECISION_LOG.md` → `wiki/decisions/index.md`
   - `plan/README.md` → `wiki/decisions/README.md`
3. Primary target: `CLAUDE.md`. Secondary: any `.claude/skills/**` or `.claude/commands/**` that reference these paths.
4. Add one new line to `CLAUDE.md` pointing to `wiki/WIKI.md` as the authoritative schema for `wiki/**` edits.

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] Grep for `docs/` and `plan/` in live files returns zero hits
3. [ ] CLAUDE.md references resolve to existing wiki files
4. [ ] CLAUDE.md mentions `wiki/WIKI.md` as the wiki schema
