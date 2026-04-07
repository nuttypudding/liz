---
paths:
  - "samples/**"
  - "apps/**/*.tsx"
  - "apps/**/*.ts"
  - "src/**/*.py"
---

# Chat UI Sample Rules

When the user requests chat functionality, a chat interface, or chat UI samples:

1. **Always create both Streamlit and Gradio versions** — run `streamlit-chat` and `gradio-chat` agents in parallel
2. **Output files**: `samples/chat_streamlit_<feature>.py` and `samples/chat_gradio_<feature>.py`
3. **Launch both** after creation:
   - Streamlit: `.venv/bin/streamlit run samples/<file>.py --server.port 8501 --server.headless true`
   - Gradio: `.venv/bin/python samples/<file>.py` (port 7860)
4. **Same feature set** — both versions must implement the same functionality for comparison
5. **Include sample data** — never show empty UIs on first load
