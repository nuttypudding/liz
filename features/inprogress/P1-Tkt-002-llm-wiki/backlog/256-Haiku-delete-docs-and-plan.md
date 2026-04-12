---
id: 256
title: Delete docs/ and plan/
tier: Haiku
depends_on: [255]
feature: llm-wiki
---

# 256 — Delete docs/ and plan/

## Objective
Remove `docs/` and `plan/` entirely. No stubs.

## Context
Per feature plan decision: delete, not stub. All references updated in task 255.

## Implementation
1. Final verification pass: `rg '\bdocs/' --glob '!wiki/**' --glob '!features/**' --glob '!node_modules/**'` and same for `plan/`. Must return zero hits.
2. `git rm -r docs/ plan/`
3. Verify `wiki/project/` and `wiki/decisions/` still contain the migrated content.
4. Run the project build/type-check once to catch any stray broken imports or doc paths in code.

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] `docs/` does not exist
3. [ ] `plan/` does not exist
4. [ ] Repo grep shows no live references to either path
5. [ ] Build/type-check passes
