---
name: wiki-query
description: Ask the wiki a question; get a cited answer; optionally file the answer back as synthesis
user_invocable: true
---

# /wiki-query &lt;question&gt; — Query the wiki

Answer questions grounded in wiki pages with inline citations. **Consult `wiki/WIKI.md` for link and citation conventions.**

## Resolution strategy (in order)

1. **Narrow, keyword-matchable** → call qmd:
   ```
   qmd search "<question>" --root wiki/
   ```
   (See [[project/workflow/qmd-search]] for CLI + MCP setup.)

2. **Broad/synthesis** → read `wiki/index.md` first, pick 3–5 candidate pages, read them in full before answering.

Always consult at least 3–5 pages before synthesizing an answer. Never answer from CLAUDE.md alone when the wiki has better info.

## Answer format

- Prose with inline `[[page]]` citations.
- No hallucinated citations. Every cited page must exist — verify paths before referencing.
- If the wiki doesn't contain enough to answer, say so explicitly. Suggest `/ingest` targets.

## File-back decision tree

After answering, decide:

| Outcome | Action |
|---|---|
| Novel synthesis worth preserving | Offer: "File this to `wiki/synthesis/<YYYY-MM-DD>-<slug>.md`?" |
| Answer exposed a gap (concept missing) | Suggest creating a new entity/concept page |
| Trivial lookup | Just log the query, don't file |

Never file-back without user approval.

## Log entry format

Append to `wiki/log.md`:

```
## [YYYY-MM-DD] query | <question>
- Consulted: [[page1]], [[page2]], [[page3]]
- Answer summary: <one line>
- Filed as: [[synthesis/<slug>]] | not filed
```

## Anti-patterns

- Don't answer without citations.
- Don't answer from CLAUDE.md or memory alone — always consult the wiki.
- Don't file-back trivial lookups — clutters `synthesis/`.
- Don't invent citations. If a page doesn't exist, don't reference it.

## Worked example 1 — narrow (qmd path)

**Question**: "What is the urgency taxonomy?"

Calls qmd → returns `wiki/concepts/urgency-triage.md`. Skill reads it, answers:

> Liz uses three urgency levels: `low`, `medium`, `emergency` ([[concepts/urgency-triage]]). Emergency triggers immediate vendor dispatch and landlord SMS; medium schedules within 48h; low queues for batch review. Thresholds are defined in the intake classification prompt ([[project/ux-plan-intake-mvp]]).

Trivial lookup — doesn't file back. Logs query entry.

## Worked example 2 — synthesis (index.md path)

**Question**: "How does Liz handle vendor selection end-to-end?"

Reads `index.md`, identifies: `[[concepts/the-core-four]]`, `[[entities/vendor]]`, decision pages on Matchmaker + Resend/Twilio. Reads all five. Synthesizes a multi-paragraph answer citing each.

Offers to file as `wiki/synthesis/2026-04-12-vendor-selection-e2e.md` — user accepts. Page created + index updated + log entry appended with `Filed as: [[synthesis/2026-04-12-vendor-selection-e2e]]`.
