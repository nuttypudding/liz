---
id: 262
title: Create /ingest skill
tier: Opus
depends_on: [248]
feature: llm-wiki
---

# 262 — Create /ingest skill

## Objective
Write `.claude/skills/ingest.md` defining the `/ingest <path-or-url>` skill — the core wiki operation.

## Context
Opus because the ingest workflow is the heart of the wiki pattern. Getting this right means every future source compounds knowledge correctly.

## Implementation
Create `.claude/skills/ingest.md` following the existing skill format (see `.claude/skills/ship.md` and `plan-feature.md` as templates). Body specifies:

1. **Input** — path to local file OR URL. If URL, fetch to `wiki/raw/<slug>.html` or `.md` first.
2. **Phase 1: Read & discuss**
   - Read the source fully
   - Summarize key takeaways to the user in 3–6 bullets
   - Ask the user: what angle matters most? any entities/concepts to highlight?
3. **Phase 2: File**
   - Create `wiki/sources/<YYYY-MM-DD>-<slug>.md` with:
     - Frontmatter: `type: source`, `raw_path: raw/<file>`, `source_url:`, `tags:`, `confidence:`
     - Body: 1-page summary with verbatim quotes for key claims, and a "Relevance to Liz" section
4. **Phase 3: Propagate**
   - Determine which `entities/` and `concepts/` pages this source touches
   - For each: read the page, integrate new info, add citation `[[sources/YYYY-MM-DD-slug]]`
   - Flag contradictions inline with `⚠️ conflict: [[sources/old]] said X, new source says Y` — do not silently override
   - Create new entity/concept pages if the source introduces something not yet covered (ask user first)
5. **Phase 4: Bookkeeping**
   - Add entry to `wiki/index.md` under the appropriate section
   - Append to `wiki/log.md`: `## [YYYY-MM-DD] ingest | <source title>` followed by a 2–3 line summary
6. **Phase 5: Suggest**
   - Suggest 2–3 follow-up sources, `/wiki-query` questions, or `/wiki-lint` passes

Include a worked example at the end of the skill doc: ingesting a fictional article and showing what gets created/updated.

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] `.claude/skills/ingest.md` exists and covers all 5 phases
3. [ ] Includes a worked example
4. [ ] Contradiction-handling policy is explicit
5. [ ] Skill registered in CLAUDE.md (task 267)
