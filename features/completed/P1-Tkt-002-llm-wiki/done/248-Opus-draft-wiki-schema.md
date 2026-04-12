---
id: 248
title: Draft WIKI.md schema
tier: Opus
depends_on: [247]
feature: llm-wiki
---

# 248 — Draft WIKI.md schema

## Objective
Write `wiki/WIKI.md` — the canonical schema Claude consults when editing `wiki/**`. This is the "CLAUDE.md of the wiki" and the most important single artifact in this feature.

## Context
See feature plan § Tech Approach and § Data Model. Parallel to `CLAUDE.md` but scoped to wiki conventions. This is Opus because schema decisions ripple through every subsequent skill and every future ingest.

## Implementation
Draft `wiki/WIKI.md` covering:

1. **Audiences** — Claude Code (writer), developer (browser), Liz (product owner via chat). Language conventions per audience.
2. **Page types** — entity | concept | source | project | decision | synthesis. When to create each.
3. **Frontmatter schema**:
   ```yaml
   type: entity|concept|source|project|decision|synthesis
   tags: [...]
   created: YYYY-MM-DD
   updated: YYYY-MM-DD
   source_ids: [...]
   confidence: low|medium|high
   ```
   Source pages additionally carry `raw_path:`.
4. **Linking convention** — Obsidian wikilinks `[[concepts/urgency-triage]]`. Every non-obvious claim needs a `[[sources/...]]` citation.
5. **Log format** — `## [YYYY-MM-DD] ingest|query|lint|feature|bug | Title`. Append-only, grep-parseable.
6. **Workflows** — Ingest (read → discuss → file `sources/<slug>.md` → propagate to entities/concepts → update index.md → append log.md). Query (read index.md first → drill → cite → offer to file answer into synthesis/). Lint (contradictions, orphans, stale claims, status.md regen).
7. **When to create vs extend** a page. Anti-duplication rules.
8. **Auto-refresh contract** — which skills refresh `status.md` and `qa-queue.md`, and when.
9. **Plain-language surface rule** — `for-liz.md` and `qa-queue.md` are the only plain-language pages; technical pages stay technical.
10. **qmd integration** — how to invoke search (CLI + MCP).

Target length: 200–400 lines. Include examples inline (sample page, sample log entry, sample frontmatter).

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] `wiki/WIKI.md` exists and covers all 10 sections above
3. [ ] Includes at least one full example page per page type
4. [ ] A cold-read test: hand WIKI.md to a fresh Claude session and verify it can execute an ingest correctly from the schema alone
5. [ ] Internal links in WIKI.md use the canonical wikilink format
