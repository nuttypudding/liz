---
id: 266
title: Create /wiki-qa-refresh skill
tier: Sonnet
depends_on: [261]
feature: llm-wiki
---

# 266 — Create /wiki-qa-refresh skill

## Objective
Write `.claude/skills/wiki-qa-refresh.md` — regenerate `wiki/qa-queue.md`, Liz's testing checklist.

## Implementation
Reads:
1. `.claude/tickets.md` — rows with status `testing` or `deployed`
2. `features/inprogress/**/done/` and `features/completed/**` — to surface recently completed features
3. `wiki/project/testing/testing-guides/**` — to link each ticket to its relevant manual test guide when one exists
4. Deployment URLs from CLAUDE.md + feature plans (QA and prod)

Writes `wiki/qa-queue.md` grouped by status:
- **Ready for you to test** (status=`testing`)
- **Live in production — sanity-check when you can** (status=`deployed`)
- **Recently closed** (last 5 closed tickets)

Each entry, written for Liz (no jargon):
```
## <Human-readable feature name> — READY FOR QA
What it does: <one sentence>
Try it at: <URL>
Testing guide: [[project/testing/testing-guides/...]]
What to watch for: <2–3 bullets in plain language>
Ticket: T-NNN
```

Append log entry: `## [YYYY-MM-DD] qa-refresh | N ready, M deployed`.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] `.claude/skills/wiki-qa-refresh.md` exists
3. [ ] Output groups tickets by status as specified
4. [ ] Per-entry format written for non-technical audience
5. [ ] Links to testing guides resolve when a guide exists
6. [ ] Skill registered in CLAUDE.md (task 267)
