---
id: 257
title: Synthesize entity pages
tier: Sonnet
depends_on: [252]
feature: llm-wiki
---

# 257 — Synthesize entity pages

## Objective
Create the initial set of entity pages under `wiki/entities/` covering the people and roles that show up throughout Liz.

## Context
Entities are people, personas, organizations. For Liz MVP the core set is: landlord, tenant, vendor, product owner (Liz), and the Claude Code agent itself.

## Implementation
Create the following pages with `type: entity` frontmatter. Content synthesized from `intake/readme.md`, `CLAUDE.md`, decision pages, and existing feature plans:

1. `wiki/entities/landlord.md` — small-landlord persona (1–20 units). Include: goals, pain points, delegation preferences, links to `[[concepts/decision-profile]]`, `[[concepts/onboarding-wizard]]`.
2. `wiki/entities/tenant.md` — tenant persona. Maintenance intake flow from their side. Links to `[[concepts/maintenance-intake]]`.
3. `wiki/entities/vendor.md` — vendor persona. Matchmaker inputs, vendor preferences. Link to `[[concepts/matchmaker]]`, `[[concepts/auto-scheduling]]`.
4. `wiki/entities/liz-product-owner.md` — the human product owner. What she cares about, how she reviews work, what she needs from the wiki (qa-queue, roadmap, chat).
5. `wiki/entities/claude-code-agent.md` — Claude Code as an active participant. What skills it runs, how it uses the wiki, how it interacts with live state.

Each page: 30–80 lines, with at least 3 outbound wikilinks. Every non-trivial claim cites a source (`[[sources/...]]` or `[[decisions/...]]` or `[[project/...]]`).

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] All 5 entity pages exist with frontmatter
3. [ ] Each has ≥3 outbound wikilinks
4. [ ] Each page registered in `wiki/index.md` (task 261 will consolidate but add entries as you go)
