---
id: 276
title: Create /run-wiki-chat skill
tier: Sonnet
depends_on: [275]
feature: llm-wiki
---

# 276 — Create /run-wiki-chat skill

## Objective
Write `.claude/skills/run-wiki-chat.md` — launches the Streamlit wiki-chat app locally.

## Implementation
Follow the existing `/run-arena` skill as a template. Skill body:
1. Confirm app directory exists
2. Verify `.env` has `ANTHROPIC_API_KEY`
3. Run `streamlit run apps/wiki-chat/app.py` (or the actual path chosen in task 274)
4. Report the local URL (`http://localhost:8501` or the Streamlit default) to the user so they can share it with Liz
5. Register the skill in CLAUDE.md Skills table

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] `.claude/skills/run-wiki-chat.md` exists
3. [ ] Skill registered in CLAUDE.md (mirroring `/run-arena` row style)
4. [ ] Executing the skill actually launches the app
