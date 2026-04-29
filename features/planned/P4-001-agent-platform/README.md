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
    │   │   ├── agent.py           # agent logic — LLM call via OpenRouter, schema validation
    │   │   ├── api.py             # FastAPI app object (uniform contract)
    │   │   ├── tools/             # agent-specific tool implementations (none for v1)
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
- OpenAI-compatible LLM client preconfigured for OpenRouter (with retry, timeout, telemetry hooks)
- OpenTelemetry tracing setup (instrumented FastAPI + outbound LLM calls)
- Eval runner (loads a JSONL dataset → runs agent → scores → reports)
- Common pydantic models for request/response

### Standard HTTP contract

Every agent implements:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/run` | Run agent, return full response (no streaming for v1) |
| GET | `/v1/health` | Liveness + readiness |
| GET | `/v1/info` | Name, version, model, capabilities, tool catalog |

Request/response shape mirrors OpenAI Chat Completions (messages array, tool_calls, usage). Liz callers never deal with agent-specific SDKs — one client helper handles all agents.

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

### LLM access — OpenRouter as the gateway

All agents call LLMs through **OpenRouter**, not directly against provider APIs. OpenRouter is OpenAI-compatible, so we use the standard `openai` Python SDK with a different `base_url`. This decouples agents from any single model provider.

```python
# agents/_shared/llm.py (sketch — not code yet)
from openai import AsyncOpenAI
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)
response = await client.chat.completions.create(
    model=os.environ["AGENT_TRIAGE_MODEL"],  # e.g. "anthropic/claude-sonnet-4-6"
    messages=[...],
)
```

**Why OpenRouter:**
- One key, ~200 models. Switching default model = change `AGENT_TRIAGE_MODEL` env var, no code change.
- Easy A/B / eval against alternate providers — the arena pattern stays useful.
- Provider-agnostic billing/observability in one dashboard.
- Vision, tool use, structured output all work via the OpenAI-compatible interface.

**Trade-offs accepted:**
- ~5% margin on token cost vs. direct provider. Negligible at MVP scale; revisit if usage grows enough to matter.
- Extra network hop adds ~50–100ms vs direct Anthropic. Fine for triage (whole flow <5s).
- Anthropic prompt caching is supported via OpenRouter, but cache hit behavior should be verified on first deploy — providers occasionally diverge here.
- One more vendor in the data path. OpenRouter has its own privacy/compliance posture; review before any sensitive data flows.

**Env var convention (per agent):**
- `OPENROUTER_API_KEY` — shared across agents, in Vercel project env
- `AGENT_<NAME>_MODEL` — primary model ID (e.g. `AGENT_TRIAGE_MODEL=anthropic/claude-sonnet-4-6`)
- `AGENT_<NAME>_FALLBACK_MODEL` — optional fallback if primary returns errors

**Framework-per-agent (no monoculture):**
- v1 triage: raw `openai` SDK + OpenRouter (~50 lines of agent logic). No agent framework.
- Future stateful agents (vendor dispatch, autonomy, comms): default to **LangGraph** when state, checkpointing, or long-running workflows justify it. Drop in alongside OpenRouter — LangGraph supports OpenAI-compatible endpoints.
- Each agent's `pyproject.toml` declares only what it needs. No shared framework dependency.

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
- LLM access: `openai` SDK pointed at OpenRouter
- Default model: `anthropic/claude-sonnet-4-6` (vision-capable Claude Sonnet via OpenRouter), configurable via `AGENT_TRIAGE_MODEL`
- Implementation shape: ~50 lines — system prompt + one chat completion call + JSON-schema validated parse. No agent framework.
- Eval set: existing 20 labeled samples in `intake/samples/`, scored against ai_category + ai_urgency labels
- Eval bonus: run the same eval against 2–3 alternate model IDs to verify the abstraction holds (e.g. `openai/gpt-5`, `google/gemini-2.5-pro`)

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
- Cost-tier model routing inside production (Haiku for cheap, Sonnet for hard) — agent picks one model per version. OpenRouter makes manual swaps trivial via env, but automatic per-request routing waits.
- A/B testing infrastructure in production — single model per version, evals catch regressions. Multi-model comparison happens in the eval suite, not at runtime.
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
| OpenRouter outage | All agents go down — single point of failure for LLM access | Configure fallback model in OpenRouter dashboard. Future: short-circuit env flag to bypass OpenRouter and call provider directly. Acceptable risk for MVP given OpenRouter's uptime track record. |
| Anthropic prompt caching divergence via OpenRouter | Cache-hit savings (~90%) might not apply, raising costs | Verify cache headers + observed hit rate on first deploy. If broken, file with OpenRouter or use direct Anthropic for caching-heavy paths. |
| Model API drift across providers | A different model ID via OpenRouter behaves differently (tool format, JSON mode, vision encoding) | Eval suite must run against the active model, not a reference one. Switching default model triggers a re-eval. |

---

## Open decisions to make before task breakdown

1. **OpenRouter prompt caching strategy.** Anthropic native caching saves ~90% on repeated system prompts. Enable cache breakpoints from day one (every triage request shares the same system prompt — large win), or wait until we see actual cache-hit behavior via OpenRouter? Probably day one.
2. **Fallback model config.** Configure in the OpenRouter dashboard (single source of truth, applies to all callers) or per-request in code (more granular, lives in repo)? Dashboard is simpler; repo is more reproducible.
3. **uv vs. pip.** Use `uv` (faster, modern, plays well with workspaces). Confirmed unless objections.
4. **Telemetry sink.** Where does OTel ship? Honeycomb / Sentry / self-hosted Phoenix / Langfuse? Langfuse is interesting for LLM-specific traces. Decide before first agent ships.
5. **Cloudflare tunnel hostnames.** `triage.agents-qa.brightstep.ai` or `triage-qa.agents.brightstep.ai`? Pick a convention.
6. **Image distribution to Spark.** Start with `docker save | ssh spark docker load`. Graduate to ghcr.io when CI exists.

---

## Task breakdown (preview — fills `backlog/` when moved to inprogress/)

Estimated 12–16 tasks. Tier mix: ~3 Haiku, ~7 Sonnet, ~3-5 Opus.

**Foundation (`agents/_shared/`)**
- Opus: design `_shared/` API: pydantic models, FastAPI scaffold, auth middleware, eval runner shape, OpenRouter LLM client wrapper (retry/timeout/tracing)
- Sonnet: implement `_shared/` library — OpenRouter-configured `AsyncOpenAI` client, FastAPI scaffold, auth middleware, eval runner
- Sonnet: write `_shared/` unit tests + contract test fixtures
- Haiku: scaffold `agents/` dir, root `pyproject.toml` (uv workspace), repo conventions doc

**maintenance-triage agent**
- Opus: agent design — system prompt, tool surface (none for v1), JSON-schema validated output, error modes, prompt-caching strategy
- Sonnet: implement `agents/maintenance-triage/src/agent.py` + `api.py` (raw `openai` SDK via OpenRouter, ~50 lines)
- Sonnet: port the 20 labeled samples into `tests/evals/dataset.jsonl` + scoring
- Sonnet: cross-model eval — run the suite against `anthropic/claude-sonnet-4-6` + 2 alternates to verify portability
- Sonnet: contract tests with recorded cassettes
- Haiku: Dockerfile + `.env.example` (with OPENROUTER_API_KEY, AGENT_TRIAGE_MODEL) + README

**Deployment**
- Sonnet: Vercel umbrella `api/index.py` + `vercel.json` + custom domain wiring
- Sonnet: Spark deploy script (build → ship via ssh → run with restart policy) + Cloudflare tunnel config update
- Haiku: GitHub Actions workflow for agent CI (path-triggered)

**Liz integration**
- Sonnet: `apps/web/lib/agents/client.ts` typed client
- Sonnet: feature-flag triage call in `apps/web/app/api/intake/route.ts` (shadow mode)
- Opus: shadow-mode comparison harness — log agent vs library output diffs
- Haiku: env var wiring (`AGENT_TRIAGE_URL`, `OPENROUTER_API_KEY`, `AGENT_TRIAGE_MODEL`, auth secret) for local/QA/prod

---

## Definition of done

- `agents/maintenance-triage` runs locally, in QA on Spark, and in prod on Vercel.
- Liz's triage path can be flipped to the agent via env flag without code changes.
- Eval pass-rate on the 20 labeled samples matches or beats current `@liz/triage` library output.
- `/v1/info` reports correct version; `/v1/health` returns 200.
- Documentation: this README, `docs/endpoints.md` updated with new agent URLs, `docs/agents.md` (new) explaining the platform pattern for future agent authors.
