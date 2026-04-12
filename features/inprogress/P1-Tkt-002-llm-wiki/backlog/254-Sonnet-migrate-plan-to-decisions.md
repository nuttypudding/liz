---
id: 254
title: Migrate plan/ to wiki/decisions/
tier: Sonnet
depends_on: [252]
feature: llm-wiki
---

# 254 — Migrate plan/ to wiki/decisions/

## Objective
Split `plan/DECISION_LOG.md` into one page per decision under `wiki/decisions/`, and migrate `plan/README.md` to `wiki/decisions/README.md`.

## Context
DECISION_LOG currently has ~22 rows. Each decision deserves its own page so it can be cross-linked from entities/concepts/sources that reference it.

## Implementation
1. Read `plan/DECISION_LOG.md`. For each row:
   - Create `wiki/decisions/YYYY-MM-DD-{kebab-title}.md`
   - Frontmatter: `type: decision`, `created: <row-date>`, `updated: <row-date>`, `status: <row-status>`, `tags: [...]`
   - Body: full decision text, rationale, related wikilinks (e.g. `[[concepts/clerk-auth]]`, `[[sources/...]]` when applicable)
2. Migrate `plan/README.md` → `wiki/decisions/README.md` with frontmatter.
3. Create `wiki/decisions/index.md` listing all decision pages in reverse-chronological order (newest first), each with a one-line summary. This is the "replacement" for DECISION_LOG.md.
4. Verify: ~22 decision pages + README + index.
5. DO NOT delete `plan/` yet — task 256 owns deletion.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] One page per DECISION_LOG row under `wiki/decisions/`
3. [ ] `wiki/decisions/index.md` lists all decisions newest-first
4. [ ] Frontmatter includes status field matching source row
5. [ ] Original `plan/` still intact (deletion is task 256)
