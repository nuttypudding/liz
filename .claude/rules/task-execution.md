---
paths:
  - "features/inprogress/**/backlog/**"
  - "features/inprogress/**/doing/**"
---

# Task Execution Rules

When working with task files in feature `backlog/` or `doing/` directories:

1. **CRITICAL — Model tier switching**: Check the task filename prefix before starting ANY task.
   - `Haiku-` prefix → routine work (config, tests, docs, scaffolding)
   - `Sonnet-` prefix → guided implementation with clear design
   - `Opus-` prefix → novel architecture, critical judgment, front-end design
   - The FIRST acceptance criterion on every task is: verify you are aware of the correct model tier
   - **Do NOT skip this step.**

2. **Task lifecycle**: `backlog/` → `doing/` → `done/` (all within `features/inprogress/<feature>/`)
   - Move to `doing/` when starting work
   - Move to `done/` when all acceptance criteria pass

3. **Feature plan lifecycle**: `features/planned/` → `features/inprogress/` → `features/completed/`
   - Move to `inprogress/` when the first task for that feature starts (create `backlog/`, `doing/`, `done/` subdirs)
   - Move to `completed/` when the last task for that feature is done

4. **Feature plan alignment**: Before implementing, check the feature's README.md in its directory. If the task contradicts the plan, update both to be consistent.

5. **Update documentation**: After completing a task that changes operational procedures (new services, CLI commands, ports, API endpoints), update relevant docs.
