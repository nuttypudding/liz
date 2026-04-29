# maintenance-triage agent (POC-1)

Hello-world FastAPI agent. Returns `"hello world"` for any input. Validates the agent platform's HTTP contract shape — no LLM call yet.

See `features/planned/P4-001-agent-platform/POC.md` for the full POC plan.

## Run

```bash
cd agents/maintenance-triage
uv sync                                                    # installs deps into .venv
cp .env.local.example .env.local                           # one-time
set -a && source .env.local && set +a                      # load env into shell
uv run uvicorn src.api:app --reload --port 8101
```

Or in one line:
```bash
uv run --env-file .env.local uvicorn src.api:app --reload --port 8101
```

Boots in <1s. Reloads on save.

## HTTP contract

Auth: `X-Agent-Auth` header required on `/v1/run` and `/v1/info`. Value must match `AGENT_SHARED_SECRET`. `/v1/health` is unauthenticated for monitor probes.

```
GET  /v1/health   → 200 {"status":"ok"}
GET  /v1/info     → 200 {"name":"maintenance-triage","version":"0.0.1","model":"stub","capabilities":[]}
POST /v1/run      → 200 {"message":"hello world","agent":"maintenance-triage","version":"0.0.1"}
```

Errors: `{"error":{"code":"<code>","message":"<msg>"}}` for 401 (auth) and 422 (validation).

## Smoke tests

```bash
SECRET=$(grep AGENT_SHARED_SECRET .env.local | cut -d= -f2-)

# happy
curl -s http://localhost:8101/v1/health
curl -s -H "X-Agent-Auth: $SECRET" http://localhost:8101/v1/info
curl -s -X POST -H "X-Agent-Auth: $SECRET" -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"hi"}]}' http://localhost:8101/v1/run

# unhappy (must fail)
curl -s -X POST -H 'content-type: application/json' -d '{"messages":[]}' \
  http://localhost:8101/v1/run                                          # 401
curl -s -X POST -H "X-Agent-Auth: wrong" -d '{}' http://localhost:8101/v1/run    # 401
curl -s -X POST -H "X-Agent-Auth: $SECRET" -H 'content-type: application/json' \
  -d 'not-json' http://localhost:8101/v1/run                            # 422
```
