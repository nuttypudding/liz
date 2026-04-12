---
type: project
tags: [workflow, template, setup, claude-md]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: brightstep_process/claude-md-template.md
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

<!-- Replace with your project description: what it does, who it's for, core differentiator -->

## Current Phase

<!-- Replace with your current development phase and what's been completed -->

### Tech Stack

<!-- Replace with your actual stack -->

| Layer | Technology |
|-------|-----------|
| Language | <!-- e.g., Python 3.12+, TypeScript --> |
| Frontend | <!-- e.g., Next.js 15 + React 19 --> |
| Backend | <!-- e.g., FastAPI, NestJS --> |
| Database | <!-- e.g., PostgreSQL 16 + pgvector --> |
| Task Queue | <!-- e.g., Redis 7+ --> |
| Testing | <!-- e.g., pytest + Playwright --> |

## Development Workflow

See `docs/workflow.md` for the full guide.

### Skills (Slash Commands)

| Skill | Purpose |
|-------|---------|
| `/nextstep` | Pick and execute the next backlog task |
| `/plan-feature <name>` | Create a feature plan |
| `/create-feature-tasks-in-backlog <name>` | Generate task files from a feature plan |
| `/fix-bug [--ticket T-NNN \| description]` | Ticket-first bug fix — diagnose, branch, fix, test, deploy |
| `/log-bug <description>` | Log a new bug ticket to `.claude/tickets.md` |
| `/update-docs` | Scan git diff, update affected documentation |
| `/ship <message>` | Tests + doc sweep + commit (user-invoked only) |
| `/review-changes` | Security & architecture review (read-only) |
| `/test-all [tier]` | Run unit + integration + UI tests |
| `/test-fix-dev` | Autonomous local dev testing |
| `/test-fix-prod` | Autonomous production testing |
| `/deploy-prod` | Deploy to production |
| `/notify <message>` | Send a notification to the user |

### Rules (auto-loaded by file path)

| Rule | Active When Editing |
|------|---------------------|
| `documentation.md` | `docs/**` |
| `plan-changes.md` | `plan/**` |
| `python-backend.md` | `src/**/*.py` |
| `typescript-frontend.md` | `apps/**/*.{ts,tsx}` |
| `task-execution.md` | `plan/Backlog/**`, `plan/Doing/**` |

### Hook

Post-commit reminder: after `git commit`, a non-blocking nudge to run `/update-docs`.

### Ticket-First Workflow

All features and bug fixes require a ticket in `.claude/tickets.md` before work begins.

- **`/log-bug`** creates bug tickets (`bug-fix-dev` or `bug-fix-prod`)
- **`/plan-feature`** auto-creates `new-feature` tickets + branches
- **`/fix-bug --ticket T-NNN`** links to an existing ticket
- **`/fix-bug <description>`** auto-creates a ticket on the fly

Categories: `new-feature`, `bug-fix-dev`, `bug-fix-prod`. Status lifecycle: `open` → `in-progress` → `testing` → `pr-open` → `deployed` → `closed`.

## Environments (Local vs Production)

<!-- Replace with your actual environments -->

| Setting | Local | Production |
|---------|-------|------------|
| Frontend | `localhost:3000` | <!-- your prod URL --> |
| Backend | `localhost:8000` | <!-- your prod URL --> |
| Database | local Docker | <!-- your prod DB --> |

## Git Branch Strategy

```
main       ──────●──────●──────●───────>  (prod — auto-deploy)
                  \           /
feature/*   ────●──●──●──●──>             (feature work)
fix/*       ────●──●──>                   (bug fixes)
```

- **`main`** → production. Protected branch (require PR).
- **`feature/*`** → new features, merged to `main` via PR.
- **`fix/*`** → bug fixes, merged to `main` via PR.

## Design Principles

### 1. Always Use the Virtual Environment
**All Python commands must use the project venv** at `.venv/`. Never install packages globally.
- Run scripts: `.venv/bin/python <script>`
- Install packages: `.venv/bin/pip install <package>`
- Run tests: `.venv/bin/python -m pytest tests/`

### 2. Always Write Tests
Every code change must include tests. No exceptions.
- **Unit tests**: For all pure logic. Use `pytest`.
- **Integration tests**: For API endpoints. Use `pytest-asyncio`.
- **UI tests**: For frontend. Use Playwright.

### 3. Always Update Documentation
After any code change, run `/update-docs` to keep docs in sync.

<!-- Add your doc-mapping table here -->
