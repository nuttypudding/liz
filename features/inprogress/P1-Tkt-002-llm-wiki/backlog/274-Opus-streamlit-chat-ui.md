---
id: 274
title: Streamlit wiki-chat UI design
tier: Opus
depends_on: [261]
feature: llm-wiki
---

# 274 — Streamlit wiki-chat UI design

## Objective
Design and scaffold the Streamlit wiki-chat app — Liz's chat surface. UI work; Opus per project convention.

## Context
Consistent with the existing Liz LLM Arena Streamlit app (`/run-arena`). Audience is Liz, non-technical.

## Implementation
1. Create `apps/wiki-chat/` (or under the existing `Liz/` umbrella if that's where Streamlit lives — check `/run-arena` for precedent).
2. Scaffold `app.py` with:
   - Left sidebar:
     - "Where we're at" button → displays `wiki/status.md`
     - "Ready to test" button → displays `wiki/qa-queue.md`
     - "Roadmap" button → displays `wiki/project/roadmap.md`
     - "Start fresh chat" button → clears session
   - Main panel: chat interface (Streamlit `st.chat_message` + `st.chat_input`)
   - Header: "Liz's Wiki Chat — ask anything about the project"
3. Style: clean, minimal, large type. No Liz-facing jargon in UI copy.
4. Include example-question chips below the input: "What's ready for me to test?", "What shipped this week?", "What's blocked?", "Explain the rent reminder feature".
5. Footer: link to refresh the wiki ("I'm out of date — ask Claude to run /wiki-lint").

NO API integration yet — task 275 wires the Claude API. This task is pure UI scaffold with hardcoded placeholder responses so Liz/you can sanity-check the experience first.

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] `streamlit run apps/wiki-chat/app.py` launches without errors
3. [ ] Sidebar buttons render the corresponding wiki page
4. [ ] Chat input echoes back placeholder responses
5. [ ] No jargon in UI copy
