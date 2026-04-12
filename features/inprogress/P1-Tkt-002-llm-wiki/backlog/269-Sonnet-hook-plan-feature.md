---
id: 269
title: Hook /plan-feature to create concept page
tier: Sonnet
depends_on: [267]
feature: llm-wiki
---

# 269 — Hook /plan-feature to create concept page

## Objective
Extend `.claude/skills/plan-feature.md` so that when a new feature is planned, Claude also creates/updates a `wiki/concepts/<kebab-topic>.md` page covering the domain concept the feature introduces.

## Implementation
1. Read current `.claude/skills/plan-feature.md`.
2. Add a step after feature plan creation:
   - Identify the domain concept(s) the feature introduces (e.g. "Rent Reminder" → `wiki/concepts/rent-reminders.md`, "Auto-scheduling Vendors" → `wiki/concepts/vendor-scheduling.md`).
   - If a concept page already exists, extend it with the new feature's angle and add a `[[features/<feature>]]` reference.
   - If not, create a stub: frontmatter, one paragraph definition, a "Related features" section linking the new feature plan, a "Related decisions" section (empty placeholder).
3. Append `wiki/log.md`: `## [YYYY-MM-DD] feature-plan | <feature-name> → [[concepts/<topic>]]`.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] `/plan-feature` creates or extends a concept page on every run
3. [ ] Existing concept pages are extended, not overwritten
4. [ ] Log entry appended
