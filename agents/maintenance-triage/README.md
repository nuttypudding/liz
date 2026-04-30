# maintenance-triage agent

FastAPI agent that triages tenant maintenance requests via OpenRouter (Claude Sonnet by default). Two-stage output: gatekeeper decides if the tenant can resolve the issue themselves; classification routes the rest to a vendor category with cost estimate.

POCs shipped: 1 (HTTP contract + auth) → 2 (real OpenRouter call) → 3 (structured JSON output, current). See `features/planned/P4-001-agent-platform/POC.md`.

## Run

```bash
cd agents/maintenance-triage
uv sync                                                    # installs deps into .venv
cp .env.local.example .env.local                           # one-time
# edit .env.local: set OPENROUTER_API_KEY=sk-or-v1-... (omit to use the
# structured stub fallback — useful for UI iteration without burning tokens)
uv run --env-file .env.local uvicorn src.api:app --reload --port 8101
```

Boots in <1s. Reloads on save.

## HTTP contract

Auth: `X-Agent-Auth` header required on `/v1/run` and `/v1/info`. Value must match `AGENT_SHARED_SECRET`. `/v1/health` is unauthenticated for monitor probes.

```
GET  /v1/health   → 200 {"status":"ok"}
GET  /v1/info     → 200 {"name":"maintenance-triage","version":"0.0.3",
                         "model":"<resolved>","openrouter_configured":<bool>,
                         "capabilities":["text","structured-triage"]}
POST /v1/run      → 200 {"agent":"maintenance-triage","version":"0.0.3",
                         "model":"<resolved>","usage":{...}|null,
                         "finish_reason":"stop"|"stub",
                         "gatekeeper":{
                           "self_resolvable":<bool>,
                           "confidence":<0..1>,
                           "troubleshooting_guide":<string|null>
                         },
                         "classification":{
                           "category":"plumbing|electrical|hvac|appliance|
                                      structural|pest|locksmith|general",
                           "urgency":"emergency|urgent|routine|scheduled",
                           "confidence_score":<0..1>,
                           "recommended_action":<string>,
                           "cost_estimate_low":<int>,
                           "cost_estimate_high":<int>
                         }}
```

Request: `POST /v1/run` body is `{"messages":[{"role":"user|system|assistant","content":"..."}], "model":"<optional override>"}`.

Errors: `{"error":{"code":"<code>","message":"<msg>"}}` for `401` (auth), `422` (request validation), `502 llm_error` (upstream OpenRouter failure), `502 llm_invalid_response` (LLM returned content the schema can't accept — non-JSON, off-enum category, missing required field, etc.).

When `OPENROUTER_API_KEY` is unset, `/v1/run` returns a fully-shaped stub triage so the web UI renders and tests pass. The stub's `recommended_action` is a breadcrumb pointing at the missing env var.

## Smoke tests

```bash
SECRET=$(grep AGENT_SHARED_SECRET .env.local | cut -d= -f2-)

# happy
curl -s http://localhost:8101/v1/health
curl -s -H "X-Agent-Auth: $SECRET" http://localhost:8101/v1/info
curl -s -X POST -H "X-Agent-Auth: $SECRET" -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"My disposal stopped working — no hum, no nothing."}]}' \
  http://localhost:8101/v1/run | jq

# unhappy (must fail)
curl -s -X POST -H 'content-type: application/json' -d '{"messages":[]}' \
  http://localhost:8101/v1/run                                          # 401
curl -s -X POST -H "X-Agent-Auth: wrong" -d '{}' http://localhost:8101/v1/run    # 401
curl -s -X POST -H "X-Agent-Auth: $SECRET" -H 'content-type: application/json' \
  -d 'not-json' http://localhost:8101/v1/run                            # 422
```

Run the unit suite: `npm run test:triage` from the repo root (31 tests).
