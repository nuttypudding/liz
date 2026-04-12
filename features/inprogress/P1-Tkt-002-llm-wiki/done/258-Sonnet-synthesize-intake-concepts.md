---
id: 258
title: Synthesize intake concepts
tier: Sonnet
depends_on: [252]
feature: llm-wiki
---

# 258 — Synthesize intake concepts

## Objective
Create concept pages for the domain ideas from `intake/readme.md` and the intake samples.

## Context
`intake/readme.md` contains product vision, The Core Four, categories, urgency levels. These are durable concepts worth dedicated pages.

## Implementation
Create `type: concept` pages:

1. `wiki/concepts/the-core-four.md` — Gatekeeper, Estimator, Matchmaker, Ledger. One paragraph per pillar with wikilinks to features/feature pages.
2. `wiki/concepts/maintenance-category-taxonomy.md` — plumbing, electrical, hvac, structural, pest, appliance, general. Definitions, edge cases, links to representative `[[sources/...]]` from `intake/samples/`.
3. `wiki/concepts/urgency-triage.md` — low / medium / emergency. Criteria, examples, safety implications, links to sample sources.
4. `wiki/concepts/intake-json-schema.md` — the `ai_maintenance_intake` structure. Copy diagram from CLAUDE.md. Link to implementation in code.
5. `wiki/concepts/confidence-scoring.md` — how Claude emits confidence scores, thresholds for human review. Placeholder if not yet specified in the code.

For category and urgency pages, cite at least 2 `wiki/sources/*` (ingested from `intake/samples/*` per the manifest).

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] All 5 concept pages exist with frontmatter
3. [ ] Category and urgency pages each cite ≥2 source pages
4. [ ] No duplication with entity pages — entities describe *who*, concepts describe *what*
