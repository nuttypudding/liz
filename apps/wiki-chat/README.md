# Liz Wiki Chat

Conversational interface over the Liz project wiki, built with Streamlit.

## Launch

```bash
/run-wiki-chat
```

Or manually:

```bash
source .venv/bin/activate
streamlit run apps/wiki-chat/app.py --server.port 8502
```

## Audience

Liz (non-technical product owner) and the engineering team. Copy avoids jargon.

## Files

- `app.py` — Streamlit entry point (sidebar, chat, sidebar views)
- `wiki_chat/` — Claude API integration (added in task 275)

## Status

- **Task 274 (current)**: UI scaffold with placeholder chat responses.
- **Task 275 (next)**: Claude API wired to full `wiki/**` corpus via prompt caching.
