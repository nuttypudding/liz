# Wiki Log

Append-only chronological record. Newest entries at bottom.

## [2026-04-12] migration | docs/ → wiki/project/

- 25 files migrated with `type: project` frontmatter
- Internal link rewrites: `docs/` → `wiki/project/`, wikilinks where targets exist
- Sources retained until task 256; no data loss
- Task: 253-Sonnet-migrate-docs-to-wiki-project (P1-Tkt-002-llm-wiki)

## [2026-04-12] migration | plan/ → wiki/decisions/

- 22 decision pages split from `plan/DECISION_LOG.md` + Scale or Die Roadmap (23 total)
- [[decisions/index]] created as replacement for DECISION_LOG.md
- plan/README.md was a stub; skipped
- Task: 254-Sonnet-migrate-plan-to-decisions

## [2026-04-12] migration | CLAUDE.md references updated

- `docs/endpoints.md` → `wiki/project/endpoints.md`
- `docs/testing-framework.md` → `wiki/project/testing-framework.md`
- Retired `documentation.md` and `plan-changes.md` path-scoped rules
- Added Wiki section pointing at [[WIKI]]
- Task: 255-Haiku-update-claudemd-references

## [2026-04-12] migration | Deleted docs/ and plan/

- `git rm -r docs/ plan/` — no stubs
- Remaining `docs/` / `plan/` refs are external URLs only (nextjs.org, supabase.com)
- Task: 256-Haiku-delete-docs-and-plan

## [2026-04-12] synthesis | Initial entity pages

- 5 pages created: landlord, tenant, vendor, liz-product-owner, claude-code-agent
- 329 lines total; 45 outbound wikilinks to verified pages
- Task: 257-Sonnet-synthesize-entity-pages

## [2026-04-12] synthesis | Intake concept pages

- 5 pages created: the-core-four, maintenance-category-taxonomy, urgency-triage, intake-json-schema, confidence-scoring
- Sources cited as [[sources/...]] forward-refs pending first `/ingest`
- Task: 258-Sonnet-synthesize-intake-concepts

## [2026-04-12] synthesis | Stack & operational concept pages

- 6 pages created: tech-stack, clerk-roles, ticket-lifecycle, model-tier-system, feature-branch-lifecycle, supabase-local-dev
- Task: 259-Sonnet-synthesize-stack-concepts

## [2026-04-12] synthesis | Workflow concept pages

- 2 pages created: brightstep-process, skills-catalog
- Decision page `2026-04-01-adopt-brightstep-process` already existed from prior migration
- Task: 260-Sonnet-synthesize-workflow-concepts

## [2026-04-12] status-refresh | Initial hand-crafted status.md

- Consolidation pass: [[index]], [[log]], [[status]], [[for-liz]] populated
- Subsequent refreshes by `/wiki-status` (task 265) and `/wiki-qa-refresh` (task 266)
- Task: 261-Opus-populate-index-status-forliz
