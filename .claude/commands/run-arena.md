---
description: Launch the Liz LLM Arena Streamlit dashboard
---

# /run-arena — Launch LLM Arena Dashboard

## Instructions

1. **Kill any existing Streamlit processes** to free the port:
   ```bash
   pkill -f "streamlit run" 2>/dev/null || true
   ```

2. **Activate venv and launch** from the project root (no PYTHONPATH needed — app.py self-resolves paths):
   ```bash
   cd /Users/noelcacnio/repo/liz
   source .venv/bin/activate
   streamlit run apps/arena/arena/app.py --server.port 8501
   ```

3. **Tell the user** the app is running at `http://localhost:8501`

## If it fails with missing modules

```bash
cd /Users/noelcacnio/repo/liz
source .venv/bin/activate
pip install -e packages/shared
pip install streamlit pydantic pyyaml pillow
pip install openai anthropic google-genai groq python-dotenv
```

## Key details

- Do NOT use `PYTHONPATH` — `app.py` adds `apps/arena/` and `packages/shared/` to `sys.path` automatically
- Do NOT `cd` into `apps/arena/` before running — launch from project root with the full path `apps/arena/arena/app.py`
- The app reads samples from `intake/samples/` using path resolution relative to `app.py`, so the working directory doesn't matter
- Port 8501 is the default; if occupied, kill stale processes first
