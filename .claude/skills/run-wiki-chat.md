---
name: run-wiki-chat
description: Launch the Liz Wiki Chat Streamlit app (conversational interface over the project wiki)
user_invocable: true
---

# /run-wiki-chat — Launch Wiki Chat Dashboard

## Instructions

1. **Confirm the app exists**:
   ```bash
   test -f apps/wiki-chat/app.py || echo "apps/wiki-chat/app.py missing — run task 274"
   ```

2. **Check the API key**:
   ```bash
   grep -q '^ANTHROPIC_API_KEY=' .env || echo "WARN: ANTHROPIC_API_KEY not in .env — chat will render but can't answer"
   ```

3. **Kill any existing Streamlit on 8502** (wiki-chat lives on 8502 so it doesn't collide with `/run-arena` on 8501):
   ```bash
   lsof -ti:8502 | xargs kill -9 2>/dev/null || true
   ```

4. **Activate venv and launch** from the project root:
   ```bash
   source .venv/bin/activate
   streamlit run apps/wiki-chat/app.py --server.port 8502
   ```

5. **Tell the user** the app is running at `http://localhost:8502`, and remind them they can share this URL with Liz while on the same network.

## If it fails with missing modules

```bash
source .venv/bin/activate
pip install streamlit anthropic python-dotenv
# or, if the pyproject is wired up:
pip install -e apps/wiki-chat
```

## Key details

- `app.py` self-resolves paths — launch from any cwd
- The wiki corpus is rebuilt on every fresh session; if you just edited `wiki/**`, click "Start fresh chat" to pick up changes
- Cached tokens appear in the footer after each turn — if `cached` is 0 on turn 2+, prompt caching regressed
- Port 8502 is the default; `/run-arena` uses 8501
