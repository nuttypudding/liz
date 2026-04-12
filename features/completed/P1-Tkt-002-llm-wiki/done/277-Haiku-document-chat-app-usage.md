---
id: 277
title: Document chat app usage
tier: Haiku
depends_on: [276]
feature: llm-wiki
---

# 277 — Document chat app usage

## Objective
Write `wiki/project/workflow/wiki-chat.md` — operator's guide to the chat app.

## Implementation
Page covers:
1. Who it's for (Liz, you)
2. How to launch (`/run-wiki-chat`)
3. What it can and can't answer (cited wiki content only)
4. When to refresh the wiki before chatting (after merges, deploys — recommend running `/wiki-lint`)
5. Troubleshooting: no API key, Streamlit not installed, port in use, corpus too big
6. Future hosted path (Streamlit Cloud → Vercel+Clerk) — placeholder section marked "not started"

Also add a "Chat with the wiki" callout in `wiki/for-liz.md` (already created in task 261) pointing to this guide.

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] `wiki/project/workflow/wiki-chat.md` exists with all 6 sections
3. [ ] `wiki/for-liz.md` links to it
4. [ ] Page registered in `wiki/index.md`
