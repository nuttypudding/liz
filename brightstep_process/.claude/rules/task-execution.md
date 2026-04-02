---
paths:
  - "plan/Backlog/**"
  - "plan/Doing/**"
---

# Task Execution Rules

When working with task files in `plan/Backlog/` or `plan/Doing/`:

1. **CRITICAL — Model tier switching**: Check the task filename prefix before starting ANY task.
   - `Haiku-` prefix → run `/model haiku` before starting
   - `Sonnet-` prefix → run `/model sonnet` before starting
   - `Opus-` prefix → run `/model opus` before starting
   - The FIRST acceptance criterion on every task is: verify you switched to the correct model tier
   - **This has been missed multiple times. Do NOT skip this step.**

2. **Task lifecycle**: `plan/Backlog/` → `plan/Doing/` → `features/completed/<feature>/`
   - Move to `Doing/` when starting work
   - Move to `features/completed/<feature>/` when all acceptance criteria pass
   - Create the target directory if it doesn't exist

3. **Docker-first for infrastructure**: If a task involves installing or setting up any service, it MUST use Docker via `infrastructure/docker-compose.yml`. Never install directly on the host.

4. **Feature plan alignment**: Before implementing, check `features/planned/<feature>/README.md` for the high-level plan. If the task contradicts the plan, update both to be consistent.

5. **Update documentation**: After completing a task that changes operational procedures (new services, CLI commands, ports, Docker containers), update `docs/runbook.md`.
