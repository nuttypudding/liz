---
id: 263
title: Create /wiki-query skill
tier: Opus
depends_on: [248, 250]
feature: llm-wiki
---

# 263 — Create /wiki-query skill

## Objective
Write `.claude/skills/wiki-query.md` defining `/wiki-query <question>` — ask the wiki anything.

## Context
Opus because the query workflow governs how the wiki is *used* — how citations work, when to file answers back, when to use qmd vs index.md.

## Implementation
Create `.claude/skills/wiki-query.md` covering:

1. **Resolution strategy** (in order):
   - If question is narrow + keyword-matchable → call qmd (CLI or MCP) with the question
   - Otherwise → read `wiki/index.md` first, identify relevant pages, read them
   - Always read the top 3–5 candidate pages before answering
2. **Answer format** — prose with inline `[[page]]` citations. No hallucinated citations. If unknown, say so.
3. **File-back decision** — after answering, decide:
   - If the answer is a novel synthesis worth keeping → offer to file it into `wiki/synthesis/<YYYY-MM-DD>-<slug>.md`
   - If the answer filled a gap → suggest a new entity/concept page
   - Otherwise → just log the query in `wiki/log.md`
4. **Log entry format** — `## [YYYY-MM-DD] query | <question>` followed by which pages were consulted and one-line answer summary
5. **Anti-patterns** — don't answer without citations; don't answer from CLAUDE.md alone when the wiki has better info; don't file back trivial answers

Include 2 worked examples: one narrow question resolved via qmd, one broad synthesis question resolved via index.md drill.

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] `.claude/skills/wiki-query.md` exists
3. [ ] Resolution strategy explicit about qmd vs index.md
4. [ ] File-back decision tree documented
5. [ ] 2 worked examples included
6. [ ] Skill registered in CLAUDE.md (task 267)
