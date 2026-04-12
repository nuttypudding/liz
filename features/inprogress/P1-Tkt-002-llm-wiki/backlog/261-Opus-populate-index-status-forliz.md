---
id: 261
title: Populate index, log, status, for-liz
tier: Opus
depends_on: [253, 254, 257, 258, 259, 260]
feature: llm-wiki
---

# 261 — Populate index, log, status, for-liz

## Objective
Fill the four wiki root pages that give shape to everything else: `index.md`, `log.md`, `status.md`, `for-liz.md`. This is Opus because it involves synthesis and writing for a non-technical audience (Liz).

## Context
`index.md` is the catalog. `log.md` starts the chronological record. `status.md` is the auto-refreshed project-state view. `for-liz.md` is Liz's plain-language landing.

## Implementation

### `wiki/index.md`
Catalog of every wiki page, grouped by section (Entities, Concepts, Sources, Project, Decisions, Synthesis). One line per page: `- [[path/page]] — one-line summary`. Must cover every page created by tasks 253–260. Keep alphabetical within sections.

### `wiki/log.md`
Append-only chronological log. First entries (one per migration task):
```
## [YYYY-MM-DD] migration | docs/ → wiki/project/
## [YYYY-MM-DD] migration | plan/ → wiki/decisions/
## [YYYY-MM-DD] synthesis | initial entity pages (5)
## [YYYY-MM-DD] synthesis | initial concept pages (11)
```

### `wiki/status.md`
Synthesized "where are we at" view. Initial hand-crafted version (task 265 automates refresh). Sections:
- **Phase** — current phase per `features/roadmap.md`
- **In flight** — active feature branches, tasks in `doing/` across all inprogress features
- **Open tickets** — summary of `.claude/tickets.md` (open, in-progress, testing)
- **Recent shipped** — last 5 log entries of type `feature` or `deploy`
- **Blockers** — anything flagged

### `wiki/for-liz.md`
Liz's landing page. Plain language, no jargon. Sections:
- **Where Liz is at today** — one paragraph
- **What needs your attention** — link to `[[qa-queue]]`
- **What's coming** — link to `[[project/roadmap]]` with narrative summary
- **Chat with the wiki** — instructions to run `/run-wiki-chat`
- **Questions the wiki can answer** — 5 example questions

Avoid: acronyms, ticket IDs, file paths, technical jargon. Use plain terms ("the notification system", not "the notifications module").

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] `index.md` catalogs every existing wiki page
3. [ ] `log.md` has its first 4+ entries in canonical format
4. [ ] `status.md` accurately reflects current `features/inprogress/` and `.claude/tickets.md`
5. [ ] `for-liz.md` contains no jargon (spot-check: no occurrence of "API", "Clerk", "RLS", "middleware", "JSON")
