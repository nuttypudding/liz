# Deploy maintenance-triage to Spark — `triage-qa.brightstep.ai`

This runbook stands up the agent + web test on the Spark and exposes them at `https://triage-qa.brightstep.ai` via the existing Cloudflare Tunnel.

## Architecture

```
your laptop  →  https://triage-qa.brightstep.ai
                  │
                  ▼
              Cloudflare Edge → tunnel `brightstep`
                  │
                  ▼
              Spark localhost:3303    ← Next.js test web (systemd user unit)
                  │ server-side fetch with X-Agent-Auth
                  ▼
              Spark localhost:8101    ← FastAPI agent (systemd user unit)
              (loopback, never leaves the box)
```

End users only ever hit `triage-qa.brightstep.ai`. The agent stays internal — only the Next.js server-side proxy reaches it, over loopback. Faster than a round-trip through the tunnel and means the agent doesn't need its own public URL.

## Ports

| Port | Purpose | Owner |
|------|---------|-------|
| 3001 | Legacy Liz QA (existing — `liz-qa.brightstep.ai`) | don't touch |
| 3300 | Ikigai QA (existing — `ikigai-qa.brightstep.ai`) | don't touch |
| 8100 | Ikigai QA API (existing — `ikigai-qa-api.brightstep.ai`) | don't touch |
| **8101** | **maintenance-triage agent (new)** | this runbook |
| **3303** | **maintenance-triage web test (new)** | this runbook |

## Pre-reqs (already done on Spark — verify with the commands below)

Done during initial setup on 2026-04-29:

| Step | Command to verify |
|------|-------------------|
| Repo cloned at `~/Documents/repo/liz`, on `qa` branch | `cd ~/Documents/repo/liz && git branch --show-current` → `qa` |
| `uv` installed at `~/.local/bin/uv` | `~/.local/bin/uv --version` → `uv 0.11+` |
| `npm install` complete | `ls ~/Documents/repo/liz/node_modules/@liz/triage` → symlink |
| `uv sync` complete (agent .venv populated) | `ls ~/Documents/repo/liz/agents/maintenance-triage/.venv` |
| Env files created with matching `X-Agent-Auth` secret | `cat ~/Documents/repo/liz/agents/maintenance-triage/.env.local` |
| Cloudflare Tunnel `brightstep` running | `pgrep -a cloudflared` (uses `/etc/cloudflared/config.yml`) |

If any are missing, the relevant commands are at the bottom of this doc.

## Step 1 — manual boot + smoke test (no systemd yet)

Open two terminals on Spark.

**Terminal 1 — agent:**
```bash
cd ~/Documents/repo/liz/agents/maintenance-triage
~/.local/bin/uv run --env-file .env.local uvicorn src.api:app --port 8101 --host 127.0.0.1
```

**Terminal 2 — web (and smoke tests):**
```bash
cd ~/Documents/repo/liz
PORT=3303 npm run dev --workspace=apps/maintenance-triage-web-test -- --port 3303 --hostname 127.0.0.1 &
sleep 8
SECRET=$(grep AGENT_SHARED_SECRET agents/maintenance-triage/.env.local | cut -d= -f2)

# health (no auth)
curl -s -w "\nHTTP %{http_code}\n" http://localhost:8101/v1/health

# run with auth
curl -s -w "\nHTTP %{http_code}\n" -X POST -H "X-Agent-Auth: $SECRET" \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"hi"}]}' \
  http://localhost:8101/v1/run

# proxy round-trip via the web app's API route
curl -s -w "\nHTTP %{http_code}\n" -X POST \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"hi"}]}' \
  http://localhost:3303/api/run

# rejection path (must be 401)
curl -s -w "\nHTTP %{http_code}\n" -X POST \
  -H 'content-type: application/json' \
  -d '{"messages":[]}' \
  http://localhost:8101/v1/run
```

Expected: 200 from health/info/run/proxy with the hello-world body, and 401 from the no-auth call.

When done, stop them: `Ctrl-C` the agent terminal, and `kill %1` (or `lsof -ti:3303 | xargs kill`) for the web.

## Step 2 — systemd user units (persistent)

Create the unit dir if it doesn't exist:
```bash
mkdir -p ~/.config/systemd/user
```

### `~/.config/systemd/user/triage-agent.service`

```ini
[Unit]
Description=Liz maintenance-triage agent
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/noelcacnio/Documents/repo/liz/agents/maintenance-triage
EnvironmentFile=/home/noelcacnio/Documents/repo/liz/agents/maintenance-triage/.env.local
ExecStart=/home/noelcacnio/.local/bin/uv run uvicorn src.api:app --port 8101 --host 127.0.0.1
Restart=on-failure
RestartSec=3
StandardOutput=append:/home/noelcacnio/logs/triage-agent.log
StandardError=append:/home/noelcacnio/logs/triage-agent.log

[Install]
WantedBy=default.target
```

### `~/.config/systemd/user/triage-web.service`

```ini
[Unit]
Description=Liz maintenance-triage web test
After=triage-agent.service network.target

[Service]
Type=simple
WorkingDirectory=/home/noelcacnio/Documents/repo/liz
EnvironmentFile=/home/noelcacnio/Documents/repo/liz/apps/maintenance-triage-web-test/.env.local
ExecStart=/usr/bin/npm run dev --workspace=apps/maintenance-triage-web-test -- --port 3303 --hostname 127.0.0.1
Restart=on-failure
RestartSec=3
StandardOutput=append:/home/noelcacnio/logs/triage-web.log
StandardError=append:/home/noelcacnio/logs/triage-web.log

[Install]
WantedBy=default.target
```

Enable + start:
```bash
mkdir -p ~/logs
loginctl enable-linger $USER          # one-time — lets user units run without an active SSH session
systemctl --user daemon-reload
systemctl --user enable --now triage-agent.service triage-web.service
systemctl --user status triage-agent.service triage-web.service --no-pager
tail -f ~/logs/triage-agent.log ~/logs/triage-web.log    # Ctrl-C to detach
```

Both services should show `active (running)`. Verify with:
```bash
curl -s http://localhost:8101/v1/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3303/
```

> **Note on `next dev` vs prod**: the unit runs `next dev`, which gives you HMR and recent-commit-shows-fast at the cost of ~2x CPU and slightly slower first-paint. For tighter QA, swap `dev` → `start` and add a `build` step on `git pull`. Defer that until/unless it matters.

## Step 3 — Cloudflare Tunnel ingress (sudo)

`cloudflared` reads `/etc/cloudflared/config.yml`. The current ingress (verified 2026-04-29):

```yaml
tunnel: brightstep
credentials-file: /home/noelcacnio/.cloudflared/969b0d58-63b7-4608-8286-83fb4a27b036.json

ingress:
  - hostname: ikigai-qa.brightstep.ai
    service: http://localhost:3300
    originRequest:
      noTLSVerify: true
  - hostname: ikigai-qa-api.brightstep.ai
    service: http://localhost:8100
    originRequest:
      connectTimeout: 60s
      noTLSVerify: true
  - hostname: liz-qa.brightstep.ai
    service: http://localhost:3001
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

Add the new ingress rule **before** the catch-all:

```bash
sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.bak.$(date +%s)
sudoedit /etc/cloudflared/config.yml
```

Insert above the `http_status:404` line:

```yaml
  - hostname: triage-qa.brightstep.ai
    service: http://localhost:3303
    originRequest:
      noTLSVerify: true
```

Validate the file before reloading:
```bash
~/.local/bin/cloudflared tunnel ingress validate --config /etc/cloudflared/config.yml
```

Expected: `OK` and a list including `triage-qa.brightstep.ai`.

## Step 4 — DNS record for the new hostname

`cloudflared` can add the CNAME to Cloudflare DNS for you (no dashboard click):

```bash
~/.local/bin/cloudflared tunnel route dns brightstep triage-qa.brightstep.ai
```

Expected: `Added CNAME triage-qa.brightstep.ai which will route to this tunnel tunnelID=...`

## Step 5 — Reload cloudflared

```bash
sudo systemctl reload cloudflared
sudo systemctl status cloudflared --no-pager
```

Or restart if reload doesn't pick up the new ingress:
```bash
sudo systemctl restart cloudflared
```

## Step 6 — Verify externally

From your laptop:
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://triage-qa.brightstep.ai/
# → HTTP 200
```

Or open https://triage-qa.brightstep.ai in a browser.

The form's `Send to agent →` button should hit the proxy → agent and return `hello world`.

## Operate

| Want to | Command |
|---------|---------|
| Tail logs | `tail -f ~/logs/triage-agent.log ~/logs/triage-web.log` |
| Restart after a `git pull` | `cd ~/Documents/repo/liz && git pull && systemctl --user restart triage-web triage-agent` |
| Stop both services | `systemctl --user stop triage-web triage-agent` |
| Disable on next boot | `systemctl --user disable triage-web triage-agent` |
| Bump agent deps | `cd ~/Documents/repo/liz/agents/maintenance-triage && uv sync && systemctl --user restart triage-agent` |
| Bump web deps | `cd ~/Documents/repo/liz && npm install && systemctl --user restart triage-web` |
| Rotate the shared secret | regenerate in both `.env.local` files (must match), then `systemctl --user restart triage-web triage-agent` |

## Pre-req commands (if any pre-reqs were missing)

If anything in the verification table was missing, here's how it was set up. (Already done on the Spark on 2026-04-29 — listed for reference / reproducibility.)

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Pull repo + install
cd ~/Documents/repo/liz
git pull
npm install
cd agents/maintenance-triage
~/.local/bin/uv sync

# Generate matching shared secret + write env files
SECRET=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
cat > ~/Documents/repo/liz/agents/maintenance-triage/.env.local <<EOF
AGENT_SHARED_SECRET=$SECRET
EOF
cat > ~/Documents/repo/liz/apps/maintenance-triage-web-test/.env.local <<EOF
AGENT_TRIAGE_URL=http://localhost:8101
AGENT_TRIAGE_SHARED_SECRET=$SECRET
EOF
chmod 600 ~/Documents/repo/liz/agents/maintenance-triage/.env.local
chmod 600 ~/Documents/repo/liz/apps/maintenance-triage-web-test/.env.local
```

## Troubleshooting

**`systemctl --user status` shows the unit failed.**
Read `~/logs/triage-{agent,web}.log`. Common causes:
- Wrong `WorkingDirectory` — `EnvironmentFile` path errors fail silently. Verify both paths exist.
- Wrong port already taken — `ss -tlnp | grep :8101` or `:3303`.
- `uv` or `npm` not on the systemd PATH — units use absolute paths above; confirm `which uv` and `which npm` match.

**`cloudflared tunnel ingress validate` fails.**
- Check YAML indentation. Each `- hostname:` block must align.
- Make sure the catch-all `- service: http_status:404` stays last.
- Restore the backup: `sudo cp /etc/cloudflared/config.yml.bak.* /etc/cloudflared/config.yml`.

**External URL returns 502/503.**
- Tunnel reaches the Spark but localhost:3303 isn't responding. Check `systemctl --user status triage-web`.
- The web's `AGENT_TRIAGE_URL` env var points somewhere other than `http://localhost:8101`. Re-check `.env.local`.

**External URL returns 530 (CF tunnel error).**
- DNS record didn't land. Re-run `cloudflared tunnel route dns brightstep triage-qa.brightstep.ai`.
- The CNAME points at the wrong tunnel. In Cloudflare DNS dashboard, the record's target should be `<tunnel-uuid>.cfargotunnel.com` for the `brightstep` tunnel.

**Web app loads but Send button gets `502 agent_unreachable`.**
- Agent isn't running or env mismatch. From Spark: `curl http://localhost:8101/v1/health` should return `{"status":"ok"}`. If it does, the secret is wrong — compare both `.env.local` files line-for-line.

## What this is NOT

- Not production. This is QA — `next dev` mode, dev secrets, no rate limiting, no observability, no monitoring.
- Not POC-2 (no real LLM yet). The agent still returns hardcoded `hello world`. POC-2 wires OpenRouter; nothing about this Spark setup will change for that — same ports, same systemd units, same tunnel config.
- Not a substitute for Vercel prod. When the agent platform graduates to prod, it'll deploy via Vercel as POC-9 plans. Spark stays as the QA harness.

## Decision log reference

This deploy follows the architecture decided in `plan/DECISION_LOG.md` (entries dated 2026-04-28):
- Three deploy targets, one codebase: local Mac (uvicorn), Spark QA (this doc), Vercel prod (future)
- Auth via shared secret in `X-Agent-Auth` header
- Loopback-only agent on the Spark; only the web is publicly reachable
