# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Liz** is an AI Property Manager platform. The goal is to automate landlord tasks: maintenance triage, vendor coordination, tenant communication, and rent reminders. The MVP focuses on **AI Maintenance Intake** — classifying tenant-submitted issues by category and urgency, then recommending actions.

## Current Phase

MVP implementation. UI scaffolding complete. Backend wiring in progress.

## Development Workflow

This project uses the BrightStep development process. See `PROCESS.md` in `brightstep_process/` for full reference.

### Skills (Slash Commands)

| Skill | Status | Purpose |
|-------|--------|---------|
| `/nextstep` | Active | Pick and execute the next backlog task |
| `/plan-feature <name>` | Active | Create a feature plan + ticket + branch |
| `/create-feature-tasks-in-backlog <name>` | Active | Generate task files from a feature plan |
| `/fix-bug [--ticket T-NNN \| description]` | Active | Ticket-first bug fix workflow |
| `/log-bug <description>` | Active | Log a new bug ticket |
| `/update-docs` | Active | Scan git diff, update affected documentation |
| `/ship <message>` | Active | Tests + doc sweep + commit (user-invoked only) |
| `/review-changes` | Active | Security & architecture review (read-only) |
| `/autorunner-status` | Active | Check autorunner progress |
| `/run-dev` | Pending | Start local dev servers (needs tech stack) |
| `/test-all` | Pending | Run all tests (needs tech stack) |
| `/test-fix-dev` | Pending | Autonomous local QA (needs endpoints) |
| `/test-fix-prod` | Pending | Autonomous production QA (needs prod URLs) |
| `/deploy-prod` | Pending | Production deployment (needs infra) |
| `/overnight-qa` | Pending | Comprehensive overnight QA (needs features) |
| `/notify` | Pending | Notifications (needs service credentials) |

### Rules (auto-loaded by file path)

| Rule | Active When Editing |
|------|---------------------|
| `documentation.md` | `docs/**` |
| `plan-changes.md` | `plan/**` |
| `task-execution.md` | `features/inprogress/**/backlog/**`, `features/inprogress/**/doing/**` |

### Hook

Post-commit reminder: after `git commit`, a non-blocking nudge to run `/update-docs`.

### Ticket-First Workflow

All features and bug fixes require a ticket in `.claude/tickets.md` before work begins.

- `/log-bug` creates bug tickets (`bug-fix-dev` or `bug-fix-prod`)
- `/plan-feature` auto-creates `new-feature` tickets + branches
- `/fix-bug --ticket T-NNN` links to an existing ticket

Categories: `new-feature`, `bug-fix-dev`, `bug-fix-prod`.
Status lifecycle: `open` → `in-progress` → `testing` → `pr-open` → `deployed` → `closed`.

### Model Tier System

Task filenames encode the required tier for cost control:

| Tier | Prefix | Use For |
|------|--------|---------|
| Haiku | `Haiku-` | Routine: config, tests, docs, scaffolding, migrations |
| Sonnet | `Sonnet-` | Guided implementation with clear design |
| Opus | `Opus-` | Architecture, front-end design, critical judgment |

**Front-end work is always Opus.**

### Automated Task Runner

```bash
python scripts/autonextstep.py              # Run all ready tasks
python scripts/autonextstep.py --dry-run    # Preview (no execution)
python scripts/autonextstep.py --once       # Run one task, then stop
python scripts/autonextstep.py --max 5      # Run at most 5 tasks
```

## Git Branch Strategy

```
main       ──────●──────●──────●───────>  (production)
                  \           /
feature/*   ────●──●──●──●──>             (feature work)
fix/*       ────●──●──>                   (bug fixes)
```

Branch naming: `feature/T-NNN-name` or `fix/T-NNN-name`.

## Repository Structure

```
liz/
├── .claude/
│   ├── settings.json          # Hooks config (committed)
│   ├── tickets.md             # Ticket tracker
│   ├── commands/              # nextstep, plan-feature, create-feature-tasks-in-backlog
│   ├── skills/                # Slash commands (ship, fix-bug, log-bug, etc.)
│   ├── rules/                 # Path-scoped rules (documentation, plan-changes, task-execution)
│   └── hooks/                 # Post-commit reminder
├── intake/
│   ├── readme.md              # Product vision, MVP features, tech stack, roadmap
│   └── samples/               # 10 labeled maintenance intake samples
├── plan/
│   ├── README.md              # Plan overview
│   └── DECISION_LOG.md        # Decision audit trail
├── features/
│   ├── roadmap.md             # Feature tracking (Phase 1–3)
│   ├── planned/               # Upcoming feature plans (P{phase}-{seq}-{name}/)
│   ├── inprogress/            # Active features with task dirs:
│   │   └── <feature>/
│   │       ├── README.md      # Feature plan
│   │       ├── backlog/       # Pending tasks
│   │       ├── doing/         # Current task (max 1)
│   │       └── done/          # Completed tasks
│   └── completed/             # Archived completed features
├── docs/
│   ├── endpoints.md           # All URLs: local, QA, prod, API routes, app pages
│   └── ui-process.md          # UI process documentation
├── scripts/
│   └── autonextstep.py        # Automated task runner
├── brightstep_process/        # BrightStep process reference (source material)
└── CLAUDE.md                  # This file
```

## Intake JSON Schema

Every `intake.json` follows this structure:

```
ai_maintenance_intake
├── input
│   ├── tenant_message (string)
│   └── photo_upload[] (file_url, file_type, uploaded_at)
├── ai_output
│   ├── category: plumbing | electrical | hvac | structural | pest | appliance | general
│   ├── urgency: low | medium | emergency
│   ├── recommended_action (string)
│   └── confidence_score (0–1)
└── source
    ├── origin, subreddit, post_url, post_title
```

Sample directories follow: `sample_XX_<category>_<short_description>`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Auth & Billing | Clerk (`@clerk/nextjs`) — auth, roles, subscriptions |
| Database | Supabase (PostgreSQL + Storage + Realtime) |
| AI | Claude API (Sonnet for text classification, Vision for photo analysis) |
| Deployment | Vercel (frontend + API routes) |
| Language | TypeScript (strict) |

No separate backend — Next.js API routes handle all server logic for MVP. Clerk owns auth (not Supabase Auth). Supabase is a pure database + storage layer.

### Local Development

Supabase CLI runs the full stack locally via Docker (`supabase start`):
- **Postgres**: `localhost:54322`
- **Supabase Studio**: `localhost:54323`
- **Auth**: `localhost:54321`
- **Storage**: `localhost:54321/storage/v1`

Production uses Supabase cloud. Same migrations work in both environments.

## Endpoint Registry

All environment URLs, API routes, and app pages are documented in `docs/endpoints.md`. **Update that file whenever you add, rename, or remove an API route, app page, or environment URL.**

## Key Product Constraints

- MVP targets small landlords (1–20 units). Keep features minimal.
- Landlord approval is always required before actions are sent — AI assists, never acts autonomously.
- Not included in MVP: payment processing, tenant screening, legal compliance engine.

## Pending Items

These BrightStep process components are stubbed but need customization once code exists:

**Skills (need endpoints/infra)**: `/run-dev`, `/test-all`, `/test-fix-dev`, `/test-fix-prod`, `/deploy-prod`, `/overnight-qa`, `/notify`

**Rules not yet created**:
- `typescript-frontend.md` — Next.js App Router, strict TypeScript, Tailwind conventions
- `supabase.md` — RLS policies, storage bucket conventions, auth patterns

**Agents not yet created**:
- UI design/build/refine agents — can be added once component library is chosen
