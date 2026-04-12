---
id: 275
title: Streamlit wiki-chat Claude API integration
tier: Opus
depends_on: [274]
feature: llm-wiki
---

# 275 — Streamlit wiki-chat Claude API integration

## Objective
Wire the wiki-chat UI to the Claude API with prompt caching — the full `wiki/**` tree loaded into a cached system prompt so responses are grounded and fast.

## Context
Follows the `claude-api` skill pattern. Prompt caching is critical: full wiki content in the cached system prompt means cache hits on every turn after the first.

## Implementation
1. Read `claude-api` skill for the current SDK pattern.
2. On app start:
   - Walk `wiki/**`, concatenate all markdown into a single corpus (skip `raw/` binaries and `raw/assets/`).
   - Build system prompt: role ("You are the Liz project wiki assistant. Answer grounded in the provided wiki pages. Cite pages using their paths.") + full corpus + response guidelines (plain language, cite pages, say 'I don't know' if the wiki doesn't have it, suggest `/ingest` or `/wiki-query` as follow-ups).
   - Mark the corpus block as cacheable (`cache_control: { type: "ephemeral" }`).
3. On user turn: append to message history, send to Claude Sonnet (prefer latest `claude-sonnet-4-6`), stream response into `st.chat_message`.
4. Surface usage: small footer showing "cached tokens used" vs "fresh tokens" so we can verify caching is working.
5. Config: `ANTHROPIC_API_KEY` from `.env`. Model ID from env with sane default. Max wiki corpus size cap (e.g. 800k tokens) with graceful truncation if exceeded — log which pages got dropped.
6. Error handling: if API fails, show friendly Liz-facing message ("I can't reach my brain right now — try again in a minute").

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] Chat returns grounded answers with page-path citations
3. [ ] Cache-hit token count visible and > 0 on second turn
4. [ ] Error state renders a non-technical message
5. [ ] Works offline up to the API boundary (corpus builds even without API key)
6. [ ] Corpus size cap enforced with logged dropped pages
