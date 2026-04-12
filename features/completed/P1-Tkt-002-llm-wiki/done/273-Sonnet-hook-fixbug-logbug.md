---
id: 273
title: Hook /fix-bug + /log-bug to wiki
tier: Sonnet
depends_on: [267]
feature: llm-wiki
---

# 273 — Hook /fix-bug + /log-bug to wiki

## Objective
`/fix-bug` and `/log-bug` append to `wiki/log.md` and, when a bug reveals domain insight, propose adding it to a concept page.

## Implementation
1. Read `.claude/skills/fix-bug.md` and `.claude/skills/log-bug.md`.
2. On `/log-bug`: append `## [YYYY-MM-DD] bug-logged | T-NNN — <title>`.
3. On `/fix-bug` completion: append `## [YYYY-MM-DD] bug-fixed | T-NNN — <title>` with the root cause in 1 sentence.
4. When `/fix-bug` identifies a root cause that reflects a non-obvious system behavior (e.g. "Clerk webhook doesn't set publicMetadata.role for self-signup"), propose appending a "Known gotcha" section to the relevant concept page (e.g. `wiki/concepts/clerk-roles.md`). Ask the user before editing.
5. On ticket status changes triggered by these skills, invoke `/wiki-qa-refresh`.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] Log entries appended for both skills
3. [ ] Root-cause insights proposed as concept-page additions (with user approval gate)
4. [ ] `/wiki-qa-refresh` called on ticket status change
