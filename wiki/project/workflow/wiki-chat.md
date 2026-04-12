---
type: project
tags: [workflow, chat, streamlit, wiki, liz-facing]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# Wiki Chat — Operator Guide

The Wiki Chat is a Streamlit app that lets Liz (and anyone else) ask questions about the project in plain English. Answers are grounded in the `wiki/**` tree and cited by page path.

## 1. Who it's for

- **Liz** (product owner, non-technical) — primary audience. Sidebar buttons surface "Where we're at", "Ready to test", and the roadmap without needing to know wiki file paths.
- **Engineers** — secondary. Useful for quick lookups without opening the repo.

## 2. How to launch

```bash
/run-wiki-chat
```

The skill kills any stale Streamlit on port 8502, activates the venv, and starts the app at `http://localhost:8502`. The URL is shareable on the same network.

## 3. What it can and can't answer

**Can:**
- Anything currently in `wiki/**` — status, roadmap, features, decisions, concepts, for-liz, qa-queue, source summaries.
- Cross-references between pages (e.g. "which features depend on the Clerk auth decision?").

**Can't:**
- Anything not yet ingested into the wiki. If it doesn't have the info, the assistant is instructed to say so honestly and suggest `/ingest` or `/wiki-query`.
- Anything under `wiki/raw/assets/**` (binaries are excluded from the corpus).

The corpus is capped at ~800k tokens. Current size is ~109k — well under the cap. Dropped pages (if any) appear in the sidebar expander.

## 4. When to refresh before chatting

The assistant reads the wiki at app-startup. If Liz is about to ask about something new, make sure the wiki is current:

- After a merge → ask Claude to run `/wiki-status` so "Where we're at" reflects reality.
- After a deploy → `/wiki-qa-refresh` rewrites "Ready to test" with the prod URL.
- After ingesting a new source → click "Start fresh chat" in the sidebar to rebuild the corpus.
- On any doubt → `/wiki-lint` flags drift, orphans, and stale claims.

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ANTHROPIC_API_KEY not set` banner | Add the key to `.env` at the repo root and restart. |
| `ModuleNotFoundError: streamlit` | `source .venv/bin/activate && pip install streamlit anthropic python-dotenv` |
| Port 8502 already in use | `lsof -ti:8502 \| xargs kill -9`, then relaunch. The skill does this automatically. |
| Footer shows `cached: 0` on turn 2+ | Prompt caching regressed — check that `wiki_chat/client.py` still sets `cache_control: ephemeral` on the corpus block. |
| "Corpus too big" — pages dropped | Raise `WIKI_CHAT_MAX_TOKENS` env var or prune `wiki/raw/`. Dropped list shows in the sidebar. |
| Friendly "I can't reach my brain" message | Transient API error. Retry. If persistent, check Anthropic status and the app's stderr log. |

## 6. Future hosted path

**Not started.** Today the chat runs locally. Target deployment is Streamlit Cloud behind Clerk (or Vercel + a Python serverless runtime) so Liz can visit a URL without setup. Cost profile and auth flow are undecided. See [[concepts/llm-wiki]] for the broader chat-surface thinking.
