# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Liz** is an AI Property Manager platform. The goal is to automate landlord tasks: maintenance triage, vendor coordination, tenant communication, and rent reminders. The MVP focuses on **AI Maintenance Intake** — classifying tenant-submitted issues by category and urgency, then recommending actions.

## Current Phase

Phase 1 MVP complete. Deployed to Vercel production.

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
| `/merge-to-main` | Active | Push branch + create PR + merge to main |
| `/review-changes` | Active | Security & architecture review (read-only) |
| `/autorunner-status` | Active | Check autorunner progress |
| `/run-dev` | Active | Start local dev servers |
| `/test-all` | Active | Run all tests (unit, component, E2E) |
| `/test-fix-dev` | Pending | Autonomous local QA (needs test-fix loop) |
| `/test-fix-prod` | Active | Autonomous production smoke test + fix loop (`apps/web/e2e-prod/*.mjs`) |
| `/deploy-prod` | Active | Production deployment to Vercel |
| `/overnight-qa` | Pending | Comprehensive overnight QA (needs test matrix) |
| `/notify` | Pending | Notifications (needs service credentials) |
| `/ingest <path-or-url>` | Active | Read a source, file it into the wiki, propagate to entity/concept pages |
| `/wiki-query <question>` | Active | Ask the wiki a question with citations; optionally file the answer into `synthesis/` |
| `/wiki-lint` | Active | Health-check the wiki (orphans, contradictions, stale claims, index drift) |
| `/wiki-status` | Active | Regenerate `wiki/status.md` from live feature/ticket/git state |
| `/wiki-qa-refresh` | Active | Regenerate `wiki/qa-queue.md` — Liz's plain-language testing checklist |
| `/run-wiki-chat` | Active | Launch the local Streamlit chat app for Liz (port 8502) |

### Rules (auto-loaded by file path)

| Rule | Active When Editing |
|------|---------------------|
| `task-execution.md` | `features/inprogress/**/backlog/**`, `features/inprogress/**/doing/**` |
| `wiki.md` | `wiki/**` |

> `documentation.md` and `plan-changes.md` rules are retired — their scopes (`docs/**`, `plan/**`) no longer exist. Content conventions now live in `wiki/WIKI.md` and decision-logging is handled within `wiki/decisions/`.

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
main ──●──────────────────────────●──────────────────────●───>
        \                        /\                      /
         feature/P2-002 ──●──●──●  feature/P2-003 ──●──●
              (push, PR, merge)       (push, PR, merge)
```

Branch naming: `feature/<feature-name>` (e.g., `feature/P2-002-auto-scheduling-vendors`) or `fix/T-NNN-name`.

### Feature-Branch Lifecycle

Each feature runs on a dedicated branch. When all tasks complete:
1. `/nextstep` pushes the branch and creates a PR via `gh pr create`
2. `autonextstep.py` merges the PR, checks out main, and starts the next feature

State is tracked in `.claude/feature-lifecycle.json`:
- `in_progress` — feature tasks are running on the feature branch
- `pr_created` — all tasks done, PR awaits merge
- `merged` — PR merged, ready for next feature
- `error` — merge failed, needs manual intervention

Use `--no-auto-merge` with `autonextstep.py` to pause after PR creation for manual review.

## Feature Naming Conventions

Two naming conventions exist for feature plans:

| Convention | Pattern | Use When |
|------------|---------|----------|
| **Planned** | `P{phase}-{seq}-{name}` | Pre-roadmap features designed during planning (e.g., `P1-002-clerk-auth`, `P2-001-rent-reminder`) |
| **Ticket-driven** | `P{phase}-Tkt-{seq}-{name}` | Reactive work within an existing phase — bug fixes, product feedback, enhancements (e.g., `P1-Tkt-001-mvp-ux-overhaul`) |

Both live in `features/planned/` (or `features/inprogress/` when active). The `Tkt` convention signals work that originated from a ticket, bug report, or product review rather than upfront roadmap planning.

**When to use `Tkt`**: Any feature or bug fix that responds to feedback on an existing phase. If Liz (product owner) reviews Phase 1 and requests changes, those become `P1-Tkt-{seq}`. If a bug is found in production Phase 1 code, the fix becomes `P1-Tkt-{seq}`.

**When to use sequential**: Planned roadmap features designed before implementation begins (`P1-001`, `P2-001`, etc.).

## Repository Structure

```
liz/
├── .claude/
│   ├── settings.json          # Hooks config (committed)
│   ├── tickets.md             # Ticket tracker
│   ├── commands/              # nextstep, plan-feature, create-feature-tasks-in-backlog
│   ├── skills/                # Slash commands (ship, fix-bug, log-bug, etc.)
│   ├── rules/                 # Path-scoped rules (documentation, plan-changes, task-execution, wiki)
│   └── hooks/                 # Post-commit reminder
├── intake/
│   ├── readme.md              # Product vision, MVP features, tech stack, roadmap
│   └── samples/               # 10 labeled maintenance intake samples
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
├── wiki/                      # LLM-maintained knowledge base (see wiki/WIKI.md)
│   ├── WIKI.md                # Authoritative schema for wiki/**
│   ├── index.md, log.md, status.md, for-liz.md, qa-queue.md
│   ├── entities/, concepts/, sources/, synthesis/, decisions/
│   ├── project/               # Operational reference (endpoints, testing, workflow, etc.)
│   └── raw/                   # Immutable source drops (+ assets/)
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
| Framework | Next.js 16 (App Router) |
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

All environment URLs, API routes, and app pages are documented in `wiki/project/endpoints.md`. **Update that file whenever you add, rename, or remove an API route, app page, or environment URL.**

## Testing

Test structure, feature-to-test mapping, and coverage gaps are documented in `wiki/project/testing-framework.md`. **Consult that file before writing or modifying tests.** Each feature must be independently testable — see the feature-to-test mapping to find which test files cover a given feature and where gaps exist.

## Wiki

`wiki/` is the project's LLM-maintained knowledge base. Schema and workflows live in `wiki/WIKI.md` (auto-loaded via `.claude/rules/wiki.md` when editing `wiki/**`). Decisions, domain concepts, personas, ingested sources, and operational reference live under the wiki. Liz (product owner) consults `wiki/for-liz.md` and `wiki/qa-queue.md`.

## Key Product Constraints

- MVP targets small landlords (1–20 units). Keep features minimal.
- Landlord approval is always required before actions are sent — AI assists, never acts autonomously.
- Not included in MVP: payment processing, tenant screening, legal compliance engine.

## Pending Items

**Skills (need implementation)**:
- `/test-fix-dev` — Autonomous test-fix loop (endpoints and test infra exist, needs loop logic)
- `/overnight-qa` — Full test matrix with data flow verification
- `/notify` — Notification service credentials

**Rules not yet created**:
- `typescript-frontend.md` — Next.js App Router, strict TypeScript, Tailwind conventions
- `supabase.md` — RLS policies, storage bucket conventions, auth patterns
