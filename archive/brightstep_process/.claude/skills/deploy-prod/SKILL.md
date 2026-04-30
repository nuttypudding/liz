---
name: deploy-prod
description: Deploy the student dashboard to production — self-hosted on DGX Spark via Cloudflare Tunnel + Vercel frontend.
---

# Deploy to Production (Self-Hosted)

Deploy the BrightStep.AI student dashboard to production:
- **Backend**: Self-hosted on DGX Spark, exposed via Cloudflare Tunnel at `api.brightstep.ai`
- **Frontend**: Vercel CDN (auto-deploys on push to `main`)

## Step 0: Detect Branch & Workflow

```bash
git branch --show-current
```

**If on a feature/fix branch** (not `main`): Use the PR workflow (Steps 1-2a).
**If on `main`**: Use the direct push workflow (Step 2b).

## Step 1: Pre-flight Checks

Run these checks in parallel:

**Check A — Working tree is clean:**
```bash
git status
```
If there are uncommitted changes, warn the user and ask if they want to commit first (suggest `/ship`). Do NOT proceed with uncommitted changes.

**Check B — Tests pass:**
```bash
cd /home/noelcacnio/Documents/repo/brightstepai/brightstepai
.venv/bin/python -m pytest tests/ -x -q --ignore=tests/e2e --ignore=tests/test_full_research.py 2>&1 | tail -20
```

**Check C — Frontend builds:**
```bash
cd /home/noelcacnio/Documents/repo/brightstepai/brightstepai/apps/student
npm run build 2>&1 | tail -20
```

**Check D — Local services healthy:**
```bash
# FastAPI backend
curl -sf -o /dev/null -w "%{http_code}" http://localhost:8100/health
# Embedding server
curl -sf -o /dev/null -w "%{http_code}" http://localhost:8001/health
# Llama Coach (vLLM)
curl -sf -o /dev/null -w "%{http_code}" http://localhost:8300/v1/models
# Llama Guard (vLLM)
curl -sf -o /dev/null -w "%{http_code}" http://localhost:8200/v1/models
# PostgreSQL
docker exec brightstep_postgres pg_isready -U brightstep -d brightstep
# Redis
docker exec brightstep_redis redis-cli ping
# Cloudflare Tunnel
curl -sf -o /dev/null -w "%{http_code}" https://api.brightstep.ai/health
```
If any local service is down, warn the user. If the tunnel is down, run `systemctl --user restart brightstep-tunnel`.

**Check E — Migration status:**
```bash
.venv/bin/python -c "
import asyncio
from brightstep.db.connection import get_session

async def check():
    async with get_session() as session:
        result = await session.execute('SELECT COUNT(*) FROM alembic_version')
        print(f'Migration table OK')
asyncio.run(check())
"
```

If tests fail or build fails, stop and report. Do NOT deploy broken code.

## Step 1.5: Apply Pending Migrations (if any)

If Check E found pending migrations, run them against the local production database:

```bash
# Apply with alembic
cd /home/noelcacnio/Documents/repo/brightstepai/brightstepai
.venv/bin/alembic upgrade head
```

**WARNING**: Always apply migrations BEFORE deploying code that depends on new columns/tables.

## Step 2a: PR Workflow (from feature/fix branch)

1. Push the branch:
   ```bash
   git push -u origin <current-branch>
   ```

2. Create a PR (if one doesn't already exist):
   ```bash
   gh pr create --title "<branch description>" --body "Deploying to production."
   ```
   If a PR already exists for this branch, skip creation.

3. Merge the PR:
   ```bash
   gh pr merge --squash --delete-branch
   ```

4. Switch to main and pull:
   ```bash
   git checkout main && git pull origin main
   ```

5. Continue to Step 3.

## Step 2b: Direct Push (from main)

```bash
git push origin main
```

This triggers Vercel auto-deploy on push. Continue to Step 3.

## Step 3: Deploy Backend (Self-Hosted)

The backend runs directly on DGX Spark. Deploy by pulling latest code and restarting:

```bash
# Option A: Use the deploy script
bash infrastructure/scripts/deploy-local.sh

# Option B: Manual steps
cd /home/noelcacnio/Documents/repo/brightstepai/brightstepai
git pull origin main
.venv/bin/pip install -e . --quiet
systemctl --user restart brightstep-api 2>/dev/null || {
    pkill -f "uvicorn brightstep.backends.student.app" 2>/dev/null || true
    sleep 2
    nohup .venv/bin/uvicorn brightstep.backends.student.app:app --host 0.0.0.0 --port 8100 > /tmp/brightstep-api.log 2>&1 &
}
```

Wait for backend health:
```bash
for i in $(seq 1 30); do
    curl -sf -o /dev/null http://localhost:8100/health && echo "Backend healthy!" && break
    [ "$i" -eq 30 ] && echo "ERROR: Backend failed to start" && exit 1
    sleep 1
done
```

## Step 4: Verify Backend (via Tunnel)

Health check through the Cloudflare Tunnel:

```bash
curl -s --max-time 15 https://api.brightstep.ai/health
```

Expected: `{"status":"ok","service":"student-api","redis":"connected"}`

If the health check fails:
```bash
# Check tunnel status
systemctl --user status brightstep-tunnel
# Check backend logs
tail -30 /tmp/brightstep-api.log
# Check all services
bash infrastructure/scripts/healthcheck.sh
```

Common issues:
- Tunnel down → `systemctl --user restart brightstep-tunnel`
- Backend crashed → check `/tmp/brightstep-api.log`
- DB connection → `docker exec brightstep_postgres pg_isready -U brightstep`
- vLLM services → `docker compose -f infrastructure/docker-compose.yml ps`

## Step 5: Verify Frontend (Vercel)

Check the Vercel deployment:

```bash
curl -s --max-time 10 -o /dev/null -w "%{http_code}" https://student-theta-teal.vercel.app
curl -s --max-time 10 -o /dev/null -w "%{http_code}" https://student-theta-teal.vercel.app/chat
```

Expected: both return `200`.

If either fails, the Vercel build may still be running (1-2 minutes after push). Wait and retry.

## Step 6: End-to-End Smoke Test

Tell the user to verify manually:

1. Open `https://student-theta-teal.vercel.app/chat`
2. Type a message — SSE streaming should work through the Cloudflare Tunnel
3. Chat through IKIGAI questions — Llama 3.3 70B should respond contextually
4. Test matching — click "See My Matches" when coach says profile is ready
5. Test mode: visit `https://student-theta-teal.vercel.app/chat?test=yes`
6. Sign in: Clerk auth → profile page → verify persistent matching

## Step 7: Update Ticket (if applicable)

Check if the deployed branch name contains a ticket reference (e.g., `fix/T-002-*` or `feature/T-003-*`). If so, update `.claude/tickets.md`:
- Set the ticket status to `deployed`
- Add the commit hash to the Deployed column

## Step 8: Report

Summarize:
- Git push: commit hash + branch
- PR: URL (if PR workflow was used)
- Backend: health check result (local + tunnel)
- Vercel: HTTP status + URL
- Ticket: updated status (if applicable)
- Any issues found

If everything passes, confirm: "Production deployment complete."

---

## Reference

All production endpoints, env vars, and troubleshooting info:
**[`deployment/deployment_environment_setup.md`](../../deployment/deployment_environment_setup.md)**

### Service Architecture (Self-Hosted)

| Service | Port | Container | Purpose |
|---------|------|-----------|---------|
| FastAPI | 8100 | (native) | Student API backend |
| Llama 3.3 70B | 8300 | brightstep_llama_coach | Coach LLM + NeMo self-check |
| Llama Guard 4 | 8200 | brightstep_llama_guard | Content safety classification |
| Embedding Server | 8001 | brightstep_embedding | BrightStep-Embedding-8B (4096-dim) |
| PostgreSQL | 5432 | brightstep_postgres | Production database |
| Redis | 6379 | brightstep_redis | Cache + rate limiting |
| Cloudflare Tunnel | — | (systemd) | Exposes api.brightstep.ai |
| gpt2-large | 1337 | (optional) | NeMo V2 perplexity heuristics |

### Key Scripts

```bash
# Deploy (pull + restart)
bash infrastructure/scripts/deploy-local.sh

# Health check (all services)
bash infrastructure/scripts/healthcheck.sh

# Database backup (manual trigger)
bash infrastructure/scripts/backup-db.sh

# Docker services
cd infrastructure && docker compose up -d    # Start all containers
cd infrastructure && docker compose ps       # Check status
cd infrastructure && docker compose logs -f  # Follow logs
```

### Embedding Endpoints

| Provider | Base URL | API Key Var | Dims |
|----------|----------|-------------|------|
| Local (production) | `http://localhost:8001/v1` | `not-needed` | 4096 |
| HF TEI (fallback) | `https://<id>.endpoints.huggingface.cloud` | `HF_TOKEN` | 4096 |
