# AGENTS.md

Guidance for Codex working in this repository. (See `CLAUDE.md` for the canonical project doc — this is the Codex companion.)

## Project Overview

**Liz** is an AI Property Manager platform. Active scope is the **Agent Platform** (Phase 4) — standalone AI agents with a uniform HTTP contract. The legacy Liz monolith (Phases 1–3) is preserved under `archive/` and serves production from `archive/apps/web/`.

## Current Phase

**Phase 4 — Agent Platform** (P4-001, T-018). POC-1 complete: hello-world `maintenance-triage` agent + web test harness, 20 tests. POC-2 (real OpenRouter call) is next.

## Repository Structure

```
liz/
├── agents/maintenance-triage/         # First agent — Python FastAPI, POC-1
├── apps/maintenance-triage-web-test/  # Next.js test harness (port 3300)
├── intake/                            # Product vision + 20 labeled samples (for evals)
├── features/planned/P4-001-agent-platform/   # Active feature plan + POC docs
├── plan/DECISION_LOG.md               # Architectural decisions
├── archive/                           # Legacy Liz monolith — see archive/README.md
│   └── apps/web/                      # Vercel deploys production from here
├── .claude/, .agents/                 # Claude Code + Codex tooling
└── package.json                       # npm workspaces (slim)
```

## Tech Stack (agents)

| Layer | Tech |
|-------|------|
| Agents | Python 3.12+, FastAPI, uv |
| LLM | OpenRouter (OpenAI-compatible), env-configurable model |
| Auth | `X-Agent-Auth` shared secret in starlette middleware |
| Test web | Next.js 16 |

Microsoft Agent Framework was rejected. Framework-per-agent: raw `openai` SDK for stateless, LangGraph reserved for stateful. See `plan/DECISION_LOG.md` 2026-04-28 entries.

## Ticket Workflow

Tickets in `.claude/tickets.md`. T-001..T-017 are archived Phase 1–3 work. T-018 is active P4-001.

Categories: `new-feature`, `bug-fix-dev`, `bug-fix-prod`. Status: `open → in-progress → testing → pr-open → deployed → closed`.

## Local dev (POC-1)

```bash
# Agent
cd agents/maintenance-triage
uv sync && uv run --env-file .env.local uvicorn src.api:app --reload --port 8101

# Web test
npm install && npm run dev:triage-test    # http://localhost:3300

# Tests
npm run test:triage                       # 20 pytest tests
```

## Working with archived code

The legacy Liz app is at `archive/apps/web/` in the working tree on main. Read directly — no branch switching needed. The pre-archive snapshot is also preserved as the immutable tag `legacy/pre-agent-platform`.
