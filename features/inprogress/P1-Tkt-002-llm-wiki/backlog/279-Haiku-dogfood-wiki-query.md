---
id: 279
title: Dogfood /wiki-query end-to-end
tier: Haiku
depends_on: [263, 278]
feature: llm-wiki
---

# 279 — Dogfood /wiki-query end-to-end

## Objective
Validate `/wiki-query` answers real questions with proper citations and the file-back decision works.

## Implementation
1. Ask `/wiki-query` three questions covering different resolution paths:
   - Narrow/keyword: "What is the urgency taxonomy?" (should resolve via qmd or direct concept page)
   - Synthesis: "How does Liz handle vendor selection end-to-end?" (should require drilling through multiple pages)
   - Gap-check: "What do we know about tenant screening laws in California?" (should honestly say limited info and suggest `/ingest`)
2. Verify each answer:
   - Contains wikilink citations
   - No hallucinated pages (every cited page exists)
   - Question 3 does NOT hallucinate specifics
3. For the synthesis question, accept the skill's offer to file the answer into `wiki/synthesis/YYYY-MM-DD-vendor-selection.md`.
4. Confirm log entries appended for all three queries.

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] All three questions answered with citations
3. [ ] Zero hallucinated citations
4. [ ] One synthesis page filed
5. [ ] Three log entries present
