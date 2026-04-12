---
id: 259
title: Synthesize stack & operational concepts
tier: Sonnet
depends_on: [252]
feature: llm-wiki
---

# 259 — Synthesize stack & operational concepts

## Objective
Create concept pages for the technical and operational ideas derived from `CLAUDE.md`.

## Implementation
Create `type: concept` pages:

1. `wiki/concepts/tech-stack.md` — Next.js + Tailwind + Supabase + Clerk + Claude API + Vercel. Why each, what it owns. Links to `[[decisions/...]]` rows that chose them.
2. `wiki/concepts/clerk-roles.md` — landlord vs tenant, `publicMetadata.role`, role fallback, self-signup default. Link to T-017 post-mortem if captured.
3. `wiki/concepts/ticket-lifecycle.md` — open → in-progress → testing → pr-open → deployed → closed. Categories. Link to skills that drive transitions.
4. `wiki/concepts/model-tier-system.md` — Haiku/Sonnet/Opus, front-end = Opus rule, cost rationale.
5. `wiki/concepts/feature-branch-lifecycle.md` — per-feature branches, `feature-lifecycle.json`, auto-merge vs manual.
6. `wiki/concepts/supabase-local-dev.md` — Docker-based local stack, ports, migration parity.

Each page 20–60 lines. Pull content from CLAUDE.md but rewrite as standalone — these should be readable without CLAUDE.md context.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] All 6 concept pages exist with frontmatter
3. [ ] Each pulls from CLAUDE.md but reads as standalone
4. [ ] Each has ≥2 outbound wikilinks
