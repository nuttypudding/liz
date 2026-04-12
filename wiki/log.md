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

## [2026-04-12] task-done | 269 — Hook /plan-feature to create concept page

- Feature: P1-Tkt-002-llm-wiki
- Tier: Sonnet
- Changes: Added step 8 to `.claude/commands/plan-feature.md` to create/extend `wiki/concepts/<topic>.md` pages and append a `feature-plan` entry to `wiki/log.md`; step 7 now writes decisions to `wiki/decisions/` instead of the retired `plan/DECISION_LOG.md`.

## [2026-04-12] task-done | 270 — Hook /nextstep to log + status refresh

- Feature: P1-Tkt-002-llm-wiki
- Tier: Sonnet
- Changes: Added task-done log append and feature-done `/wiki-status` invocation to `.claude/commands/nextstep.md`; debounce honored (no per-task status regen).

## [2026-04-12] task-done | 271 — Hook /ship to wiki + qa-refresh

- Feature: P1-Tkt-002-llm-wiki
- Tier: Sonnet
- Changes: Replaced hardcoded doc-mapping in `.claude/skills/ship/SKILL.md` with delegation to `/update-docs`; added wiki log append and `/wiki-qa-refresh` trigger on ticket transition to testing/deployed.

## [2026-04-12] task-done | 272 — Hook /deploy-prod to qa-refresh

- Feature: P1-Tkt-002-llm-wiki
- Tier: Sonnet
- Changes: Added post-deploy ticket transition, `/wiki-qa-refresh`, `/wiki-status`, and deploy log append to `.claude/skills/deploy-prod/SKILL.md`.

## [2026-04-12] task-done | 273 — Hook /fix-bug + /log-bug to wiki

- Feature: P1-Tkt-002-llm-wiki
- Tier: Sonnet
- Changes: `/log-bug` appends `bug-logged` entry; `/fix-bug` appends `bug-fixed` entry with root cause, proposes concept-page "Known gotcha" with user approval, invokes `/wiki-qa-refresh` on ticket status change. Updated `/fix-bug` context research to `wiki/decisions/` + `wiki/project/`.

## [2026-04-12] task-done | 274 — Streamlit wiki-chat UI design

- Feature: P1-Tkt-002-llm-wiki
- Tier: Opus
- Changes: Created `apps/wiki-chat/app.py` (Streamlit scaffold — sidebar with status/qa-queue/roadmap buttons, chat panel with example chips, placeholder responses) and `apps/wiki-chat/README.md`. Task 275 will wire the Claude API.

## [2026-04-12] task-done | 275 — Streamlit wiki-chat Claude API integration

- Feature: P1-Tkt-002-llm-wiki
- Tier: Opus
- Changes: Added `wiki_chat/corpus.py` (walks `wiki/**`, caps at ~800k tokens, reports dropped pages) and `wiki_chat/client.py` (Claude streaming with `cache_control: ephemeral` on the corpus block). Rewrote `app.py` to stream real replies, surface cache/fresh/output token counts, and show a friendly message when the key is missing or the API fails. Current wiki: 75 pages, ~109k tokens.

## [2026-04-12] task-done | 276 — Create /run-wiki-chat skill

- Feature: P1-Tkt-002-llm-wiki
- Tier: Sonnet
- Changes: Added `.claude/skills/run-wiki-chat.md` (port 8502, follows `/run-arena` template); flipped CLAUDE.md entry from Pending to Active.
