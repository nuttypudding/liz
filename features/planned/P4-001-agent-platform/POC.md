# POC-1 — Hello World Agent + Test Web App

**Parent:** P4-001 Agent Platform
**Goal:** First runnable iteration. Validates repo layout, HTTP contract shape, and the local dev loop. **No LLM, no Docker, no deploy.** Two local services talking over `localhost`.

---

## What this POC delivers

1. **`agents/maintenance-triage/`** — Python FastAPI service that returns `"hello world"` for any input. Implements the v1 HTTP contract (`/v1/run`, `/v1/health`, `/v1/info`).
2. **`apps/maintenance-triage-web-test/`** — Next.js app with a single page: textarea, "Send" button, response display. Calls the agent through a Next.js API route.
3. Both run locally with hot reload.
4. Documented run commands.

## What this POC deliberately skips

- ❌ LLM call — no OpenRouter, no Anthropic key needed yet
- ❌ `agents/_shared/` library — premature with one agent. Scaffold solo, abstract later.
- ❌ Docker, Vercel, Spark — local only
- ❌ Eval suite, prompt template, vision input
- ❌ Liz integration (`apps/web/lib/agents/client.ts`) — that's a later POC

## What this POC explicitly includes for safety

Per Codex adversarial review (2026-04-28), the auth boundary is *not* deferred. Establishing the unauthenticated shape now would normalize a callable `/api/run` proxy that POC-7 could copy into Liz before agent-to-agent auth exists, exposing internal LLM execution to any caller who can hit the route. Cheap to add now, expensive to retrofit.

- ✅ **`X-Agent-Auth` shared secret** between the Next.js proxy and the agent. FastAPI rejects missing/invalid tokens with 401.
- ✅ **Request schema validation** at the agent (Pydantic models reject malformed bodies with 422).
- ✅ **Standard error response shape** — `{error: {code, message}}` for 4xx/5xx instead of ad-hoc strings.

---

## Names

| Concern | Name | Rationale |
|---------|------|-----------|
| Agent dir | `agents/maintenance-triage/` | Per P4-001 plan. Leaves room for future `support-triage`, etc. |
| Test web dir | `apps/maintenance-triage-web-test/` | Mirrors `apps/arena-web` naming convention. |
| Agent port | `8101` | Per plan; future agents get `8102`, `8103`, ... |
| Test web port | `3300` | `3000`/`3100`/`3200` already used by `web`/`test-lab`/`arena-web`. |

---

## File layout

```
agents/maintenance-triage/
├── pyproject.toml          # uv-managed: fastapi, uvicorn[standard], pydantic
├── README.md               # how to run
└── src/
    ├── __init__.py
    └── api.py              # FastAPI app: /v1/run, /v1/health, /v1/info

apps/maintenance-triage-web-test/
├── package.json            # next, react, typescript (matches workspace)
├── next.config.ts
├── tsconfig.json
├── .env.local.example      # AGENT_TRIAGE_URL, AGENT_TRIAGE_SHARED_SECRET
├── README.md               # how to run
└── app/
    ├── layout.tsx
    ├── page.tsx            # form: textarea + Send button + response box
    └── api/
        └── run/
            └── route.ts    # server route — adds X-Agent-Auth, proxies POST to agent
```

**Agent `.env.local.example`:**
```
AGENT_SHARED_SECRET=dev-local-shared-secret-change-me
```

**Web `.env.local.example`:**
```
AGENT_TRIAGE_URL=http://localhost:8101
AGENT_TRIAGE_SHARED_SECRET=dev-local-shared-secret-change-me
```

The two secrets must match for the agent to accept calls. Defaults are obvious dev placeholders so a forgotten override fails closed at code review time, not silently.

**Root `package.json`:** add `apps/maintenance-triage-web-test` to `workspaces` and add `dev:triage-test` script.

---

## HTTP contract (POC subset)

**Auth:** every request to `/v1/run` and `/v1/info` must carry `X-Agent-Auth: <shared-secret>`. Missing or wrong → 401. `/v1/health` is the only unauthenticated endpoint (so monitors can probe it).

**`POST /v1/run`** — requires `X-Agent-Auth`
```json
// request
{ "messages": [{"role": "user", "content": "anything"}] }

// response (200)
{
  "message": "hello world",
  "agent": "maintenance-triage",
  "version": "0.0.1"
}

// response (401 — missing or wrong X-Agent-Auth)
{ "error": { "code": "unauthorized", "message": "missing or invalid X-Agent-Auth header" } }

// response (422 — malformed body)
{ "error": { "code": "invalid_request", "message": "<pydantic validation summary>" } }
```

**`GET /v1/health`** → `{"status": "ok"}` (no auth required)

**`GET /v1/info`** — requires `X-Agent-Auth`
```json
{
  "name": "maintenance-triage",
  "version": "0.0.1",
  "model": "stub",
  "capabilities": []
}
```

The `messages` array shape is OpenAI-compatible from day one (POC ignores it; future POCs will use it). Locks the wire format so we don't break callers when we add real LLM logic.

**Constant-time comparison** for the shared secret (`secrets.compare_digest`) — guards against timing attacks even though POC traffic is local. Sets the right pattern for prod.

---

## Test web app flow

```
[browser] http://localhost:3300
    │
    │ user types text, clicks Send
    ▼
[browser] POST /api/run                            ← Next.js API route
    │
    │ server-side fetch — adds X-Agent-Auth from env
    ▼
[Next API] POST $AGENT_TRIAGE_URL/v1/run
           Headers: X-Agent-Auth: $AGENT_TRIAGE_SHARED_SECRET
    │
    ▼
[agent FastAPI] verifies header, returns "hello world"
                or 401 if header missing/wrong
    │
    ▼
[Next API] forwards response (preserves status code)
    │
    ▼
[browser] renders response (or error) in box below the form
```

The API-route-in-the-middle is deliberate: it mirrors the shape we'll need for `apps/web/lib/agents/client.ts` later (server-side, secret stays out of the browser, single point to add auth headers). The browser **never** sees `AGENT_TRIAGE_SHARED_SECRET` — it lives in server-side env only and the Next route reads it at request time.

---

## Run instructions (will be in each app's README too)

### Prerequisites (one-time)
- `uv` installed: `brew install uv`
- Existing repo bootstrap (Node 22, npm install already done)

### Terminal 1 — Agent
```bash
cd agents/maintenance-triage
uv sync                                          # install deps into .venv
uv run uvicorn src.api:app --reload --port 8101
```
Boots in <1s. Reloads on save.

### Terminal 2 — Test web
```bash
# from repo root
npm install                                       # picks up new workspace
cp apps/maintenance-triage-web-test/.env.local.example apps/maintenance-triage-web-test/.env.local
npm run dev:triage-test                           # next dev --port 3300
```
Visit http://localhost:3300.

---

## Validation checklist

Run through these to confirm POC-1 is done. **Both happy and unhappy paths must pass** — failed negative tests indicate the auth/validation boundary isn't enforced.

**Happy path:**
- [ ] `curl http://localhost:8101/v1/health` → 200 `{"status":"ok"}` (no auth header)
- [ ] `curl -H "X-Agent-Auth: dev-local-shared-secret-change-me" http://localhost:8101/v1/info` → 200 with `name=maintenance-triage`, `version=0.0.1`
- [ ] `curl -X POST http://localhost:8101/v1/run -H 'content-type: application/json' -H "X-Agent-Auth: dev-local-shared-secret-change-me" -d '{"messages":[]}'` → 200 with `message=hello world`
- [ ] http://localhost:3300 loads
- [ ] Form submit hits the agent and renders the response
- [ ] Editing `agents/maintenance-triage/src/api.py` triggers uvicorn reload <1s
- [ ] Editing `apps/maintenance-triage-web-test/app/page.tsx` triggers next reload <1s

**Unhappy path (must fail correctly):**
- [ ] `curl -X POST http://localhost:8101/v1/run -H 'content-type: application/json' -d '{"messages":[]}'` (no auth header) → **401** with `error.code=unauthorized`
- [ ] `curl -X POST http://localhost:8101/v1/run -H "X-Agent-Auth: wrong" -d '{}'` → **401** (wrong secret rejected before body is parsed)
- [ ] `curl -X POST http://localhost:8101/v1/run -H "X-Agent-Auth: dev-local-shared-secret-change-me" -H 'content-type: application/json' -d 'not-json'` → **422** with `error.code=invalid_request`
- [ ] `curl -X POST http://localhost:8101/v1/run -H "X-Agent-Auth: dev-local-shared-secret-change-me" -H 'content-type: application/json' -d '{"wrong_field":1}'` → **422** with `error.code=invalid_request`
- [ ] Web UI: kill the agent, submit form → renders a clean error message (e.g. "agent unreachable") rather than blank screen or stack trace
- [ ] Web UI: temporarily corrupt `AGENT_TRIAGE_SHARED_SECRET`, submit form → renders an error indicating auth failure (the proxy should pass through the 401)
- [ ] Browser DevTools → Network: confirm `X-Agent-Auth` is **never** present in browser-to-Next requests (it should only appear server-to-agent)

---

## Out-of-scope decisions to defer

- **CORS:** the test web's API route lives on the same origin as the page — no CORS needed for POC. The agent doesn't accept browser calls directly. Revisit if/when we add a SPA that calls the agent without a server proxy.
- **Logging format:** plain stdout for now. Structured logging arrives with `_shared/`.
- **Rate limiting:** none for POC. Add at the gateway layer when 3+ agents share a deploy.
- **Secret rotation:** static env var for POC. Rotation strategy belongs to the prod deploy ticket.
- **JWT / short-lived tokens:** shared secret is sufficient for server-to-server in this single-tenant context. Revisit when multi-tenant.

---

## Risks / watch-outs

| Risk | Mitigation |
|------|------------|
| Port 3300 conflict with something else | Pick another in 3300-3400 range; document the choice. |
| `uv` not installed | Listed as prereq. Fallback: `python -m venv .venv && pip install -e .` works too. |
| Vercel-shaped layout (`api/index.py` shim) doesn't exist yet | POC runs uvicorn directly. The Vercel shim arrives when we deploy, not now. |
| User confused about "is this the real agent?" | Hard-code `model: "stub"` in `/v1/info` and the response message includes "hello world" so it's obvious. |
| Shared secret accidentally committed | `.env.local` is gitignored. The example file (`.env.local.example`) carries an obvious placeholder string (`change-me`) so a forgotten override is loud, not silent. |
| Secret leaked into browser via misconfigured Next route | The Next API route lives at `app/api/run/route.ts` (server runtime). Page components never import the env var. Validation checklist includes a Network-tab check that the header doesn't appear browser-side. |
| Constant-time secret comparison forgotten | Use `secrets.compare_digest` in FastAPI. Document in code comment. Eyes-on at PR review. |

---

## Next iterations (not in POC-1)

| POC | Adds | Rough scope |
|-----|------|------------|
| POC-2 | ✅ Real OpenRouter call → Claude Sonnet returns conversational reply | shipped |
| POC-3 | ✅ Structured JSON output — gatekeeper (self-resolvable + troubleshooting guide) + classification (category/urgency/recommended_action/cost_estimate) with Pydantic schema validation, JSON-mode prompt, structured-stub fallback when no API key | shipped |
| POC-4 | Vision input (photo URLs in `messages`) | ~1h |
| POC-5 | Eval suite against 20 labeled samples in `intake/samples/` | ~3h |
| POC-6 | Extract `agents/_shared/` library (FastAPI scaffold, OpenRouter client wrapper, eval runner) | ~2h |
| POC-7 | Replace stub web with Liz integration (`apps/web/lib/agents/client.ts`, feature-flag in intake route) | ~2h |
| POC-8 | Dockerfile + Spark deploy + Cloudflare tunnel | ~2h |
| POC-9 | Vercel deploy via umbrella `api/index.py` | ~1h |

Each becomes a small commit on this branch. The `maintenance-triage-web-test` app stays useful through POC-2 through POC-5 as a hands-on debug surface; superseded by Liz integration at POC-7 (but kept in repo as a dev convenience).

---

## Definition of done for POC-1

- All checklist items pass on a fresh clone (`git clone && uv sync && npm install` is enough to run both services)
- Both READMEs (`agents/maintenance-triage/README.md`, `apps/maintenance-triage-web-test/README.md`) include exact run commands
- No secrets needed to run
- Hot reload working on both sides
- Committed to `feature/P4-001-agent-platform`

---

## Decisions captured here (will mirror to `plan/DECISION_LOG.md` once implemented)

- Agent dir: `agents/maintenance-triage/`
- Test web dir: `apps/maintenance-triage-web-test/`
- Agent port: `8101`; test web port: `3300`
- Wire format: OpenAI-compatible `messages` from day one, even when ignored
- Skip `_shared/` until 2nd agent exists
- Test web has its own Next.js API route as a server-side proxy (matches future Liz integration shape)
- **Auth boundary established at POC-1, not deferred**: `X-Agent-Auth` shared secret + Pydantic request validation + standardized error response shape. Per Codex adversarial review — defer-and-retrofit was rejected as too risky for the trust boundary that POC-7 will copy into the production app.
