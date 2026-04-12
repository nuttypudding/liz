---
name: ingest
description: Read a source, file a summary, propagate knowledge to entity/concept pages, update the wiki index and log
user_invocable: true
---

# /ingest &lt;path-or-url&gt; — Ingest a source into the wiki

The core wiki operation. Every ingest compounds knowledge: the wiki is richer after than before. **Consult `wiki/WIKI.md` for schema details before writing.**

## Input

Path to a local file OR a URL. If URL, fetch to `wiki/raw/<YYYY-MM-DD>-<slug>.{html,md,pdf}` first.

## Phase 1 — Read & discuss

1. Read the source fully.
2. Summarize key takeaways to the user in 3–6 bullets.
3. Ask: "What angle matters most here? Any entities/concepts to highlight or avoid?"
4. Wait for the user's answer before filing anything.

## Phase 2 — File the source page

Create `wiki/sources/<YYYY-MM-DD>-<slug>.md` with:

```yaml
---
type: source
raw_path: raw/<filename>
raw_type: article | paper | transcript | screenshot | interview
source_url: <url-if-any>
ingested_by: /ingest 2026-04-12
tags: [...]
created: 2026-04-12
updated: 2026-04-12
confidence: low | medium | high
---
```

Body: 1-page summary + verbatim quotes for key claims + a **Relevance to Liz** section. Source pages themselves never cite — they are citation terminals.

## Phase 3 — Propagate

1. Identify which `entities/` and `concepts/` pages this source touches.
2. For each: read the page, integrate new info, add inline citation `[[sources/<YYYY-MM-DD>-<slug>]]`.
3. **Contradictions**: if the new source contradicts existing content, insert `⚠️ conflict: [[sources/<old>]] said X, [[sources/<new>]] says Y` — **do not silently override**. Flag to user.
4. **New pages**: if the source introduces an entity/concept not yet covered, propose creation to user before writing.

## Phase 4 — Bookkeeping

1. Add an entry to `wiki/index.md` under **Sources**, alphabetical within the section.
2. Append to `wiki/log.md`:
   ```
   ## [YYYY-MM-DD] ingest | <source title>
   - Source: <path or URL>
   - Filed as: [[sources/<slug>]]
   - Updated: [[entities/foo]], [[concepts/bar]]
   - Conflicts flagged: <count or none>
   - Task/skill: /ingest
   ```

## Phase 5 — Suggest

Offer 2–3 of these to the user:
- Follow-up sources worth ingesting
- `/wiki-query` questions this source enables
- Concept pages that should be created/split given the new material
- `/wiki-lint` pass if the propagation touched many pages

## Contradiction-handling policy

Never silently override. Always preserve the old claim + new claim side-by-side with the `⚠️ conflict:` marker. The user resolves conflicts by editing the page after review.

## Worked example

**Input**: `wiki/raw/2026-04-15-tenant-screening-laws-ca.pdf`

**Phase 1**: Skill summarizes: California SB 1287 restricts automated tenant screening to certain factors; requires human review above a confidence threshold; fair-housing compliance obligations.

**Phase 2**: Creates `wiki/sources/2026-04-15-tenant-screening-laws-ca.md` with summary + quotes.

**Phase 3**: Updates `wiki/concepts/confidence-scoring.md` adding a "California legal threshold" section citing the source. Flags conflict: existing threshold guidance (0.70) contradicts SB 1287's stricter implication — inserts `⚠️ conflict:` marker for user.

**Phase 4**: Registers in `index.md` + appends log entry.

**Phase 5**: Suggests ingesting TransUnion SmartMove compliance docs next; suggests filing a new `wiki/concepts/fair-housing-compliance.md` page.
