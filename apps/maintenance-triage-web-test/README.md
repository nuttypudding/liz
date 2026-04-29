# maintenance-triage-web-test (POC-1)

Minimal Next.js test harness for the `maintenance-triage` agent. One page: textarea + Send button + response box. Calls the agent through a server-side Next.js API route that injects the `X-Agent-Auth` header.

See `features/planned/P4-001-agent-platform/POC.md` for the full POC plan.

## Run

```bash
# from repo root
cp apps/maintenance-triage-web-test/.env.local.example apps/maintenance-triage-web-test/.env.local
npm install                  # if you haven't yet
npm run dev:triage-test      # starts on http://localhost:3300
```

The agent must be running separately at `localhost:8101` (or wherever `AGENT_TRIAGE_URL` points). See `agents/maintenance-triage/README.md`.

## What it does

1. Browser POSTs `{messages}` to `/api/run` (Next.js API route, same-origin)
2. The route reads `AGENT_TRIAGE_URL` and `AGENT_TRIAGE_SHARED_SECRET` from server env
3. Forwards the body to `${AGENT_TRIAGE_URL}/v1/run` with `X-Agent-Auth: ${AGENT_TRIAGE_SHARED_SECRET}`
4. Returns the agent's response (status + body) verbatim to the browser

The browser **never** sees `AGENT_TRIAGE_SHARED_SECRET`. Verify in DevTools → Network: the auth header only appears on server-to-agent traffic, not browser-to-Next.

## Files

```
app/
├── layout.tsx          # minimal HTML shell, dark theme
├── page.tsx            # form + response display (client component)
└── api/run/route.ts    # server-side proxy with auth injection
```

No Tailwind, no shadcn — POC stays light. Real Liz integration at POC-7 will use `apps/web/lib/agents/client.ts` instead.
