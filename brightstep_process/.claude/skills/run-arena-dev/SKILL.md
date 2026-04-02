---
name: run-arena-dev
description: Start the IKIGAI Coach Chat Arena (Gradio) for local development.
user-invocable: true
---

# /run-arena-dev — Start Chat Arena (Local Dev)

Start the Gradio-based IKIGAI Coach Chat Arena for side-by-side LLM comparison.

## Service

| Service | URL | Source |
|---------|-----|--------|
| Chat Arena (Gradio) | `http://localhost:7860` | `apps/chat-arena/app.py` |

## Steps

### 1. Kill any stale process on port 7860

```bash
lsof -ti:7860 | xargs kill -9 2>/dev/null || true
sleep 1
```

### 2. Start the Chat Arena

```bash
cd <repo_root>
nohup .venv/bin/python apps/chat-arena/app.py > /tmp/chat-arena-dev.log 2>&1 &
```

Wait for Gradio to be ready:
```bash
# Poll until port 7860 returns 200 (max 20 seconds)
for i in $(seq 1 40); do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:7860 | grep -q 200 && break
  sleep 0.5
done
```

### 3. Verify the service

```bash
ARENA=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7860)
```

### 4. Report status

Print a summary:
```
Chat Arena — Local Dev
═══════════════════════
Arena: http://localhost:7860  [status]
```

If the service failed to start, check logs:
```bash
cat /tmp/chat-arena-dev.log | tail -30
```
