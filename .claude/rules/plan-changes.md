---
paths:
  - "plan/**"
  - "features/**/backlog/**"
  - "features/**/doing/**"
  - "features/**/done/**"
---

# Plan Change Rules

When editing plan or task files:

1. **ALWAYS update `plan/DECISION_LOG.md`** when making any architectural, technical, or strategic decision. Add a row with: Date, Decision, Rationale, Status.

2. **Never renumber existing task files**. New tasks get the next available number.

3. **Task files** follow the naming convention: `{id:03d}-{Tier}-{kebab-case-title}.md` where Tier is `Haiku`, `Sonnet`, or `Opus`. Never change this convention.

4. **Task files live inside their feature directory**: `features/inprogress/<feature>/backlog/`, `doing/`, or `done/`.

5. **Feature status must be accurate**: If a feature moves between states, update `features/roadmap.md` to reflect the current status.

6. **Feature lifecycle**: `features/planned/` → `features/inprogress/` → `features/completed/`. When a feature moves to `inprogress/`, ensure it has `backlog/`, `doing/`, `done/` subdirectories.
