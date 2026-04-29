# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project Overview

**Liz** is an AI Property Manager platform. The active development scope is the **Agent Platform** (Phase 4) — independently deployable AI agents with a uniform HTTP contract. The legacy Liz monolith (Phases 1–3, deployed Next.js app) is preserved under `archive/` for reference and continues to serve production from `archive/apps/web/`.

## Current Phase

**Phase 4 — Agent Platform** (P4-001, ticket T-018, active branch `feature/P4-001-agent-platform`). POC-1 complete: hello-world `maintenance-triage` agent + web test harness, 20 passing tests. POC-2 (real OpenRouter call to Claude Sonnet 4.6) is next. See `features/planned/P4-001-agent-platform/README.md` and `POC.md`.

## Repository Structure

```
liz/
├── agents/                            # Standalone agent services (Python, FastAPI)
│   └── maintenance-triage/            # First agent — POC-1
├── apps/
│   └── maintenance-triage-web-test/   # Next.js test harness for the agent
├── intake/                            # Product vision + 20 labeled samples (used for agent evals)
├── features/
│   ├── roadmap.md                     # Phase 4 roadmap; legacy phases archived
│   └── planned/P4-001-agent-platform/ # Active feature plan + POC docs
├── plan/
│   └── DECISION_LOG.md                # Architectural decisions (full history; do not trim)
├── archive/                           # Legacy Liz monolith (Phases 1–3) — see archive/README.md
│   ├── apps/web/                      # Production Next.js app — Vercel deploys from here
│   ├── apps/test-lab/, apps/arena-web/, apps/arena/
│   ├── packages/triage/               # @liz/triage classifier (legacy)
│   ├── docs/, scripts/, supabase/, brightstep_process/
│   └── features/completed/            # Phase 1–3 feature plans
├── .claude/, .agents/                 # Claude Code + Codex tooling
├── package.json                       # npm workspaces root (slim — only the test web app)
├── CLAUDE.md, AGENTS.md
```

## Tech Stack (Phase 4 / agents)

| Layer | Technology |
|-------|-----------|
| Agents | Python 3.12+, FastAPI, uv |
| LLM access | OpenRouter (OpenAI-compatible SDK), model env-configurable per agent |
| Agent framework | Per-agent choice — raw `openai` SDK for stateless; LangGraph reserved for stateful |
| Auth (agent ↔ caller) | Shared secret `X-Agent-Auth` header in starlette middleware |
| Test harness | Next.js 16 (`apps/maintenance-triage-web-test/`) |
| Deploy targets | Local (uvicorn), Spark QA (Docker — future POC), Vercel (Python function — future POC) |

Microsoft Agent Framework was evaluated and rejected; see `plan/DECISION_LOG.md` 2026-04-28 entries.

## Skills (slash commands)

| Skill | Status | Purpose |
|-------|--------|---------|
| `/plan-feature <name>` | Active | Create a feature plan + ticket + branch |
| `/log-bug <description>` | Active | Log a new bug ticket |
| `/fix-bug [--ticket T-NNN \| description]` | Active | Ticket-first bug fix workflow |
| `/ship <message>` | Active | Tests + doc sweep + commit (user-invoked) |
| `/merge-to-main` | Active | Push branch + create PR + merge |
| `/review-changes` | Active | Security & architecture review (read-only) |
| `/update-docs` | Active | Scan git diff, update affected docs |
| `/save` | Active | Save session state to memory |
| `/codex:review`, `/codex:adversarial-review`, `/codex:rescue` | Active | Second-opinion review/rescue via Codex |

UI / deploy / autorunner skills (`/ui-build`, `/deploy-prod`, `/run-dev`, `/test-all`, `/test-fix-dev`, `/test-fix-prod`, `/autorunner-status`, `/nextstep`, `/create-feature-tasks-in-backlog`) reference the legacy `apps/web/` app and are kept active for work touching `archive/apps/web/`. They will need adaptation for the agent platform when needed.

## Rules (auto-loaded by file path)

| Rule | Active when editing |
|------|---------------------|
| `documentation.md` | `docs/**` (now `archive/docs/**`) |
| `plan-changes.md` | `plan/**` |
| `task-execution.md` | `features/inprogress/**/backlog/**`, `features/inprogress/**/doing/**` |

## Ticket-First Workflow

Tickets live in `.claude/tickets.md`. T-001..T-017 cover archived Phase 1–3 work. T-018 is the active P4-001 Agent Platform ticket.

Categories: `new-feature`, `bug-fix-dev`, `bug-fix-prod`. Status lifecycle: `open` → `in-progress` → `testing` → `pr-open` → `deployed` → `closed`.

## Git Branch Strategy

```
main ──●──────●─────●──────────────●───>
        \           \              /
         feature/P4-001 ──●──●──●  (PR + merge)
```

Branch naming: `feature/<feature-name>` (e.g., `feature/P4-001-agent-platform`) or `fix/T-NNN-name`.

Feature plan naming: `P{phase}-{seq}-{name}` (planned roadmap) or `P{phase}-Tkt-{seq}-{name}` (ticket-driven within a phase).

The pre-archive snapshot is preserved as the immutable tag `legacy/pre-agent-platform`.

## Endpoint registry

Agent endpoints (POC-1, local only):
- `agents/maintenance-triage` → `http://localhost:8101/v1/{health,info,run}` (auth header: `X-Agent-Auth`)
- `apps/maintenance-triage-web-test` → `http://localhost:3300` (form + server-side proxy)

Legacy app endpoints, environment URLs, and API routes are documented in `archive/docs/endpoints.md`.

## Local dev (POC-1)

```bash
# Agent
cd agents/maintenance-triage
uv sync
cp .env.local.example .env.local
uv run --env-file .env.local uvicorn src.api:app --reload --port 8101

# Web test (from repo root, separate terminal)
npm install
cp apps/maintenance-triage-web-test/.env.local.example apps/maintenance-triage-web-test/.env.local
npm run dev:triage-test                # http://localhost:3300

# Tests
npm run test:triage                    # 20 pytest tests
```

## Working with archived code

If asked to look at the legacy Clerk/Supabase/Stripe/etc. implementation, read directly from `archive/apps/web/...`. Don't switch branches — the archive is in the working tree on main. The full legacy stack (with its own Supabase migrations, Tailwind, Clerk auth, Stripe) lives at `archive/apps/web/` exactly as it did before.

## Pending

- Adapt skills like `/run-dev`, `/test-all`, `/deploy-prod`, etc. to the agent platform shape (currently they reference `apps/web/`).
- POC-2: replace stub with OpenRouter call to Claude Sonnet 4.6.
- Future POCs: structured JSON output, vision input, eval harness, `_shared/` library, Liz integration, Spark/Vercel deploys.
