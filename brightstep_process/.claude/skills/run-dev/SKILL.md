---
name: run-dev
description: Start the student dashboard (Next.js frontend + FastAPI backend) for local development.
user-invocable: true
---

# /run-dev — Start Student Dashboard (Local Dev)

Start both the Next.js frontend and FastAPI backend for the student dashboard.

## Services

| Service | URL | Source |
|---------|-----|--------|
| Frontend (Next.js) | `http://localhost:3300` | `apps/student/` |
| Backend (FastAPI) | `http://localhost:8100` | `src/brightstep/backends/student/` |

## Steps

### 1. Kill any stale processes on ports 3300 and 8100

```bash
# Find and kill anything on port 3300
lsof -ti:3300 | xargs kill -9 2>/dev/null || true
# Find and kill anything on port 8100
lsof -ti:8100 | xargs kill -9 2>/dev/null || true
sleep 1
```

### 2. Start the FastAPI backend

```bash
cd <repo_root>
.venv/bin/uvicorn brightstep.backends.student.app:app --host 0.0.0.0 --port 8100 --reload &
```

Wait for the backend to be ready:
```bash
# Poll until health check returns 200 (max 10 seconds)
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:8100/health | grep -q 200 && break
  sleep 0.5
done
```

### 3. Start the Next.js frontend

```bash
cd <repo_root>/apps/student
nohup npm run dev > /tmp/nextjs-dev.log 2>&1 &
```

Wait for the frontend to be ready:
```bash
# Poll until port 3300 returns 200 (max 30 seconds — first compile is slow)
for i in $(seq 1 60); do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3300 | grep -q 200 && break
  sleep 0.5
done
```

### 4. Verify both services

```bash
BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8100/health)
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3300)
```

### 5. Report status

Print a summary:
```
Student Dashboard — Local Dev
═══════════════════════════════
Frontend: http://localhost:3300  [status]
Backend:  http://localhost:8100  [status]
```

If either service failed to start, check logs:
- Backend: check terminal output from uvicorn
- Frontend: `cat /tmp/nextjs-dev.log | tail -30`
