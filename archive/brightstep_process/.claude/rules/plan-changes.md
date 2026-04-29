---
paths:
  - "plan/**"
---

# Plan Change Rules

When editing files in `plan/`:

1. **ALWAYS update `plan/DECISION_LOG.md`** when making any architectural, technical, or strategic decision. Add a row with: Date, Decision, Rationale, Status.

2. **Never renumber existing plan files**. Files `plan/01-vision.md` through `plan/16-openclaw.md` have stable numbers. New sections get the next number (17, 18, ...).

3. **Update `plan/README.md` TOC** when adding new section files. The table of contents must stay in sync.

4. **Feature status must be accurate**: If a feature moves from PLANNED to IMPLEMENTED or COMPLETE, update the status in the plan file AND in `plan/README.md`.

5. **Backlog task files** follow the naming convention: `{id:03d}-{Tier}-{kebab-case-title}.md` where Tier is `Haiku` or `Opus`. Never change this convention.

6. **Feature roadmap synchronization**: When a feature moves between states (PLANNED → IN PROGRESS → COMPLETE), update `features/roadmap.md` to reflect the current status.
