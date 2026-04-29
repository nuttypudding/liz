# P4-001 — Agent Platform

**Ticket:** T-018
**Phase:** 4 — Agents as Standalone Services
**Status:** Planned
**Branch:** `feature/P4-001-agent-platform`

---

## Goal

Move AI logic out of the Liz monolith and into **independently deployable agent services**. Each agent is a standalone HTTP service with a uniform API contract. Liz (and future apps) consume agents over HTTP, not as imported libraries.

Each agent must be independently:
- **Updatable** — deploy changes to one without touching others
- **Testable** — own eval suite, own unit tests, own API contract tests
- **Iterable** — own prompts, own tools, own model choice, own version

First agent: **maintenance-triage** (replaces `@liz/triage` library + production triage logic in `apps/web`).

---

## Why now

Today, AI logic lives inside `apps/web` as the `@liz/triage` library and inline route handlers. This couples agent iteration to the web app:
- Every prompt tweak requires a Liz redeploy.
- Eval runs are mixed with Next.js tests.
- We can't run multiple model versions in parallel for A/B comparison.
- Future agents (vendor dispatch, tenant comms, autonomy) would compound the coupling.

Phase 4 establishes the agent platform pattern. Phase 4+ migrations move existing AI features onto it.

---

## Architecture

### Repo layout

```
liz/
├── apps/                          # existing Next.js + Python apps
└── agents/
    ├── _shared/                   # base library: API skeleton, auth, telemetry, eval harness
    ├── maintenance-triage/        # first agent
    │   ├── src/
    │   │   ├── agent.py           # Microsoft Agent Framework agent definition
    │   │   ├── api.py             # FastAPI app object (uniform contract)
    │   │   ├── tools/             # agent-specific tool implementations
    │   │   └── prompts/v1.md      # versioned system prompt
    │   ├── api/index.py           # 5-line Vercel shim — imports src/api.py:app
    │   ├── tests/
    │   │   ├── unit/              # tools, prompt rendering — fast, no LLM calls
    │   │   ├── evals/             # golden dataset → score → fail CI on regression
    │   │   └── contract/          # black-box hits to /v1/run with cassettes
    │   ├── Dockerfile             # for QA on Spark / future cloud
    │   ├── vercel.json            # for prod
    │   ├── pyproject.toml         # own deps (uv-managed)
    │   └── .env.example
    └── (future: vendor-dispatch/, tenant-comms/, autonomy/, ...)
```

`agents/_shared/` is a **library** (imported by each agent), not a framework agents must extend. Carries:
- FastAPI scaffold for the standard API contract
- Service-to-service auth middleware (header-based shared secret)
- OpenTelemetry tracing setup (MAF native)
- Eval runner (loads a JSONL dataset → runs agent → scores → reports)
- Common pydantic models for request/response

### Standard HTTP contract

Every agent implements:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/run` | Run agent, return full response (no streaming for v1) |
| GET | `/v1/health` | Liveness + readiness |
| GET | `/v1/info` | Name, version, model, capabilities, tool catalog |

Request/response shape mirrors OpenAI Chat Completions / MAF native (messages array, tool_calls, usage). Liz callers never deal with agent-specific SDKs — one client helper handles all agents.

**No streaming** for v1 (confirmed: triage flow <5s, fits Vercel function limits cleanly).

### Three deploy targets, one codebase

| Stage | Host | Artifact | Wrapper | URL |
|-------|------|----------|---------|-----|
| Local dev | Mac | native Python | `uvicorn --reload` | `localhost:8101` |
| QA | Spark | Docker image | `Dockerfile` | `triage.agents-qa.brightstep.ai` |
| Prod | Vercel | Function | `api/index.py` shim + `vercel.json` | `triage.agents.brightstep.ai` |

All three exercise the same FastAPI `app` object. Differences are 3–10 lines per adapter. Don't fork agent logic per environment.

### Vercel deploy strategy

**Decision: monolithic Vercel deploy for now, structured for split later.**

All agents share one Vercel project (`liz-agents`). Each agent's FastAPI sub-app is mounted under a path prefix:

```
agents.brightstep.ai/triage/v1/run
agents.brightstep.ai/vendor-dispatch/v1/run
```

Per-agent code stays isolated in `agents/<name>/` with its own pyproject.toml, tests, and deps declarations. The umbrella `api/index.py` mounts each agent's router.

Trade-off accepted: deploys are coupled (a push to vendor-dispatch redeploys triage too) and the function size cap (250MB compressed) is shared. Splitting into separate Vercel projects becomes a small mechanical change when the pain shows up — agent source doesn't change.

See `plan/DECISION_LOG.md` 2026-04-28 entry for the full rationale.

### Versioning + caller wiring

- Each agent has its own semver. Major bumps are breaking.
- Liz env vars: `AGENT_TRIAGE_URL=...`, `AGENT_TRIAGE_VERSION_PIN=1.x` (read at runtime).
- `apps/web/lib/agents/client.ts` — small typed client wrapping `fetch` to any agent. Callers never touch URLs directly.
- `/v1/info` returns the agent's actual version so clients can detect drift.

### Auth between Liz and agents

Service-to-service shared secret in a header (`X-Agent-Auth: <token>`). One secret per agent, rotated via env. No Clerk on agent endpoints — agents are server-to-server only.

### Supabase wiring

Agents share Liz's Supabase instance (no schema fork).
- Agents use the **service-role key** (server-to-server, no Clerk session).
- Writes are tagged `created_by='agent:triage@v1.2.0'` for audit.
- Schema migrations stay in `apps/web/supabase/migrations/`. Agents that need new tables add migrations there.

### Testing — three layers, all per-agent

1. **Unit** — tools, prompt rendering. Fast, no LLM calls. `pytest` in CI.
2. **Evals** — golden dataset → run agent end-to-end → score → fail CI if accuracy drops below threshold. Reuses the labeled samples and scoring patterns from `apps/arena-web`.
3. **API contract** — black-box `POST /v1/run` with recorded LLM responses (cassettes via vcrpy or similar). Catches refactor regressions.

Each layer runs independently per agent. CI uses path-based triggers — `agents/maintenance-triage/**` runs only that agent's tests.

---

## First agent: maintenance-triage

Scope for v1:
- Input: tenant message text + optional photo URLs
- Output: `{category, urgency, recommended_action, confidence}` matching the existing `ai_maintenance_intake` schema (`intake/readme.md`)
- Tools: vision analysis (when photos present), nothing else for v1 (no Supabase reads, no vendor lookup yet)
- Model: same as current production (Claude Sonnet 4.6 with vision)
- Eval set: existing 20 labeled samples in `intake/samples/`, scored against ai_category + ai_urgency labels

**Open question:** does v1 need any tools beyond the LLM call? If not, this is essentially `@liz/triage` lifted behind HTTP. The case for an agent (vs. a library) gets stronger when triage gains tools — past similar requests, vendor availability, escalation rules. v1 may be a thin wrap; v2 grows into a real agent. **This is acceptable** — establishing the platform is the goal of v1, not maximizing agent value.

---

## Migration plan (Liz consumption)

Once triage agent is in QA:
1. `apps/web/lib/agents/client.ts` — typed client
2. `apps/web/app/api/intake/route.ts` — feature-flag the agent path; fall back to `@liz/triage` library if flag off
3. Run both in parallel for a week, compare outputs (shadow mode)
4. Flip flag to agent-only, deprecate `@liz/triage` library calls
5. Remove `@liz/triage` library callers (the package can stay as a shared types module if useful)

No big bang. Library and agent coexist until we trust the agent.

---

## Out of scope for v1

- Streaming (`/v1/run/stream`) — add when an agent needs it
- Gateway service — direct addressing is fine until 3+ agents
- Multi-tenant auth (JWTs) — shared secrets are enough
- Agent-to-agent calls — agents only respond to Liz for now
- Cost-tier model routing (Haiku for cheap, Sonnet for hard) — agent picks one model per version
- A/B testing infrastructure — single model per version, evals catch regressions
- Multi-arch Docker (`linux/amd64`) — Spark is arm64; Vercel handles its own packaging

---

## Risks / watch-outs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vercel function size cap (250MB compressed) | Hits when 3-4 agents share one project with full LLM SDKs | Pick one LLM SDK per agent. Don't import "in case." Measure size on every PR. |
| Cold starts on low-traffic agents | First call after idle is 1-3s slow on Vercel Python | Acceptable for MVP. If painful, ping from web app on user load, or pay for Vercel Pro Fluid Compute. |
| Coupled deploys via shared Vercel project | One agent's bad deploy breaks all | Robust evals + canary. Splitting to separate projects is the escape hatch when pain shows. |
| Agent vs. library blurry for v1 triage | "Why did we add HTTP latency for nothing?" | Accept it. Establishing the pattern is the value. v2 with tools justifies the boundary. |
| Schema fork temptation (each agent its own DB) | Future debugging hell | Hard rule: one Supabase, migrations in `apps/web/supabase/migrations/`. |
| `_unapplied/` migrations forgotten | The 15 quarantined migrations rot | Separate ticket to either fix-and-ship or delete. Not part of this feature. |

---

## Open decisions to make before task breakdown

1. **Microsoft Agent Framework version pin.** MAF Python is young (Nov 2024 release). Pin to a specific version, plan for breaking changes. Need to check current stable.
2. **uv vs. pip.** Use `uv` (faster, modern, plays well with workspaces). Confirmed unless objections.
3. **Telemetry sink.** OTel is built into MAF. Where does it ship? Honeycomb / Sentry / self-hosted Phoenix? Decide before first agent ships.
4. **Cloudflare tunnel hostnames.** `triage.agents-qa.brightstep.ai` or `triage-qa.agents.brightstep.ai`? Pick a convention.
5. **Image distribution to Spark.** Start with `docker save | ssh spark docker load`. Graduate to ghcr.io when CI exists.

---

## Task breakdown (preview — fills `backlog/` when moved to inprogress/)

Estimated 12–16 tasks. Tier mix: ~3 Haiku, ~7 Sonnet, ~3-5 Opus.

**Foundation (`agents/_shared/`)**
- Opus: design `_shared/` API: pydantic models, FastAPI scaffold, auth middleware, eval runner shape
- Sonnet: implement `_shared/` library
- Sonnet: write `_shared/` unit tests + contract test fixtures
- Haiku: scaffold `agents/` dir, root `pyproject.toml` (uv workspace), repo conventions doc

**maintenance-triage agent**
- Opus: agent design — system prompt, tool surface (none for v1), schema validation, error modes
- Sonnet: implement `agents/maintenance-triage/src/agent.py` + `api.py`
- Sonnet: port the 20 labeled samples into `tests/evals/dataset.jsonl` + scoring
- Sonnet: contract tests with recorded cassettes
- Haiku: Dockerfile + `.env.example` + README

**Deployment**
- Sonnet: Vercel umbrella `api/index.py` + `vercel.json` + custom domain wiring
- Sonnet: Spark deploy script (build → ship via ssh → run with restart policy) + Cloudflare tunnel config update
- Haiku: GitHub Actions workflow for agent CI (path-triggered)

**Liz integration**
- Sonnet: `apps/web/lib/agents/client.ts` typed client
- Sonnet: feature-flag triage call in `apps/web/app/api/intake/route.ts` (shadow mode)
- Opus: shadow-mode comparison harness — log agent vs library output diffs
- Haiku: env var wiring (`AGENT_TRIAGE_URL`, auth secret) for local/QA/prod

---

## Definition of done

- `agents/maintenance-triage` runs locally, in QA on Spark, and in prod on Vercel.
- Liz's triage path can be flipped to the agent via env flag without code changes.
- Eval pass-rate on the 20 labeled samples matches or beats current `@liz/triage` library output.
- `/v1/info` reports correct version; `/v1/health` returns 200.
- Documentation: this README, `docs/endpoints.md` updated with new agent URLs, `docs/agents.md` (new) explaining the platform pattern for future agent authors.
