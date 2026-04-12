---
id: 278
title: Dogfood /ingest end-to-end
tier: Sonnet
depends_on: [262, 267]
feature: llm-wiki
---

# 278 — Dogfood /ingest end-to-end

## Objective
Run a real `/ingest` to verify the full flow works: source read → discuss → file → propagate → index → log.

## Implementation
1. Pick a real source. Two good candidates:
   - An existing `intake/samples/sample_XX_*/intake.json` + adjacent README (if present)
   - A public article relevant to property management (use user's choice or suggest one)
2. Run `/ingest <path-or-url>`.
3. Verify outputs:
   - `wiki/sources/YYYY-MM-DD-<slug>.md` created with frontmatter and summary
   - At least one `wiki/concepts/**` or `wiki/entities/**` page updated with a citation to the new source
   - `wiki/index.md` has a new row under Sources
   - `wiki/log.md` has a new `ingest` entry
4. Screenshot / capture the diff for the feature done/ entry.
5. If anything in the flow is clunky, file a follow-up ticket with specific improvements — do not silently fix here.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] `/ingest` completes without manual intervention past the Phase 1 "discuss" checkpoint
3. [ ] All four output artifacts verified
4. [ ] Follow-up improvements (if any) filed as a ticket
