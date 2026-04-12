---
id: 264
title: Create /wiki-lint skill
tier: Sonnet
depends_on: [248]
feature: llm-wiki
---

# 264 — Create /wiki-lint skill

## Objective
Write `.claude/skills/wiki-lint.md` — health check for the wiki.

## Implementation
Create `.claude/skills/wiki-lint.md` covering the checks to run:

1. **Orphan pages** — pages with no inbound wikilinks (except intentional roots: `index.md`, `log.md`, `status.md`, `for-liz.md`, `qa-queue.md`, `WIKI.md`).
2. **Broken wikilinks** — `[[target]]` pointing at non-existent pages.
3. **Stale claims** — pages whose `updated:` frontmatter is older than N days AND whose cited sources have newer data. (N configurable, default 30.)
4. **Contradictions** — pages containing `⚠️ conflict:` markers left unresolved from `/ingest`.
5. **Missing concept pages** — terms appearing ≥3 times across entities/sources but having no concept page.
6. **Index drift** — pages that exist on disk but are absent from `wiki/index.md`.
7. **Frontmatter violations** — missing required fields per WIKI.md schema.
8. **Status + QA refresh** — at end of lint, invoke `/wiki-status` and `/wiki-qa-refresh`.

Output: a report appended to `wiki/log.md` as `## [YYYY-MM-DD] lint | N issues found` with details, and a human-readable summary to the user.

Make the skill idempotent and non-destructive — it reports, it does not auto-fix (except status/qa refresh which are regenerations, not edits).

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] `.claude/skills/wiki-lint.md` exists
3. [ ] All 8 checks specified
4. [ ] Output format specified (log entry + user summary)
5. [ ] Skill registered in CLAUDE.md (task 267)
