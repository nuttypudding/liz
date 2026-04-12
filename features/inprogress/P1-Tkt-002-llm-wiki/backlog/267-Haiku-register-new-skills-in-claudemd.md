---
id: 267
title: Register new skills in CLAUDE.md
tier: Haiku
depends_on: [262, 263, 264, 265, 266]
feature: llm-wiki
---

# 267 — Register new skills in CLAUDE.md

## Objective
Add the new wiki skills to the Skills table in `CLAUDE.md` so they're discoverable.

## Implementation
Add rows to the Skills table in `CLAUDE.md`:

| Skill | Status | Purpose |
|-------|--------|---------|
| `/ingest <path-or-url>` | Active | Read a source, file into wiki, propagate to entity/concept pages |
| `/wiki-query <question>` | Active | Query the wiki with citations; optionally file answer to `synthesis/` |
| `/wiki-lint` | Active | Health-check wiki (orphans, contradictions, stale, index drift) |
| `/wiki-status` | Active | Regenerate `wiki/status.md` from live state |
| `/wiki-qa-refresh` | Active | Regenerate `wiki/qa-queue.md` for Liz |

Also update `wiki/concepts/skills-catalog.md` (created in task 260) to include these entries.

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] All 5 skills listed in `CLAUDE.md` Skills table
3. [ ] `wiki/concepts/skills-catalog.md` also updated
4. [ ] Status column reads "Active" for all five
