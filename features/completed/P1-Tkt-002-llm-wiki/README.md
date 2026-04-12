# Feature: LLM Wiki — Persistent Knowledge Base

**ID**: P1-Tkt-002
**Ticket**: T-018
**Phase**: 1 — MVP (meta/infrastructure, supports all phases)

## TL;DR

Replace `docs/` and `plan/` with an LLM-maintained `wiki/` — a persistent, Obsidian-compatible second brain that serves as single source of truth for project knowledge across three audiences: Claude Code, the developer, and Liz (product owner).

## Summary

Today, project knowledge is scattered: `docs/` holds operational reference, `plan/` holds decisions, `intake/` holds product vision, `brightstep_process/` holds methodology, and synthesis happens only in conversation. Every query re-derives understanding from raw sources. Nothing compounds.

This feature introduces `wiki/` — an LLM-maintained knowledge base that sits between raw sources and the reader. Claude reads new material, extracts key information, and integrates it into existing pages — updating entity pages, revising summaries, flagging contradictions. The wiki is a compounding artifact, not a retrieval target.

The wiki also becomes Liz's self-serve surface. She opens `for-liz.md` for a plain-language overview, `qa-queue.md` to see what needs testing, and chats with a local Streamlit app backed by the Claude API to ask anything else.

## User Stories

- As **Claude Code**, when I ingest a new source I want to update entity/concept pages and the index in one pass, so knowledge compounds instead of re-deriving.
- As the **developer**, I want one place to check project state (`status.md`) instead of scanning tickets, features/, and roadmap separately.
- As **Liz (product owner)**, I want to see what features are ready for me to test without asking, and chat with the wiki to learn where the project is.
- As **Claude Code**, when skills like `/ship` or `/deploy-prod` run, I want status/QA pages to auto-refresh so nobody has to remember to update them.

## Architecture

Five knowledge layers, clear ownership boundaries:

| Layer | Owns | Writer |
|---|---|---|
| `features/` | In-flight work queue (backlog/doing/done) | Skills (`/nextstep`, `/plan-feature`) |
| `.claude/tickets.md` | Bug/feature tracker | Skills (`/log-bug`, `/fix-bug`) |
| `.claude/skills/**`, `commands/**`, `rules/**` | Claude operational config | Developer + Claude |
| `CLAUDE.md` | Top-level project instructions | Developer |
| **`wiki/`** (new) | **Everything else: reference, decisions, synthesis, domain knowledge** | **Claude via wiki skills** |

`docs/` and `plan/` are deleted; their content migrates into `wiki/`.

### Directory layout

```
wiki/
├── WIKI.md                   # Schema — conventions for Claude when editing wiki/**
├── index.md                  # Catalog of every page (one-line summary each)
├── log.md                    # Append-only chronological log (ingests, queries, lints)
├── status.md                 # Auto-refreshed "where are we at" view
├── for-liz.md                # Liz's plain-language landing page
├── qa-queue.md               # Auto-synthesized: what needs testing now
├── raw/                      # Immutable source drops
│   └── assets/               # Images, PDFs
├── sources/                  # One summary page per ingested raw source
├── entities/                 # Personas, competitors, stakeholders
├── concepts/                 # Domain concepts (urgency triage, RLS, Clerk roles)
├── synthesis/                # Cross-source analyses, theses, comparisons
├── decisions/                # Migrated from plan/DECISION_LOG.md
└── project/                  # Migrated from docs/**
    ├── endpoints.md
    ├── tech-stack.md
    ├── architecture.md
    ├── ui-process.md
    ├── roadmap.md            # Mirror of features/roadmap.md with narrative
    ├── testing/              # testing-framework.md + testing-guides/
    └── workflow/             # BrightStep process, skills catalog, ticket lifecycle
```

### Data flow

```
Raw source (article, transcript, PDF)
        │
        ▼  /ingest
  sources/<slug>.md  ◄──── cites ──── entities/* concepts/* updated
        │                                      │
        └──────── index.md + log.md updated ◄──┘

Live state                        Wiki synthesis
features/inprogress/*  ──────►   status.md (auto on /nextstep, /ship)
.claude/tickets.md     ──────►   qa-queue.md (auto on /ship, /deploy-prod, /fix-bug)
features/roadmap.md    ──────►   project/roadmap.md (mirror + narrative)
```

### Liz chat surface

A local Streamlit app (`/run-wiki-chat`) loads the entire `wiki/**` tree into a Claude API system prompt with prompt caching enabled. Liz types questions; the model answers grounded in wiki pages with citations. Built on the existing `claude-api` skill pattern used by the Liz LLM Arena.

## Tech Approach

| Concern | Choice |
|---|---|
| Vault format | Plain markdown, Obsidian-compatible, wikilinks `[[concepts/foo]]` |
| Search | [qmd](https://github.com/tobi/qmd) — hybrid BM25/vector + LLM rerank, CLI + MCP server |
| Frontmatter | YAML: `type`, `tags`, `created`, `updated`, `source_ids[]`, `confidence` |
| Chat UI | Streamlit (consistent with Liz LLM Arena), Claude API with prompt caching |
| Path-scoped rule | New `.claude/rules/wiki.md` loaded when editing `wiki/**` |
| Log format | `## [YYYY-MM-DD] ingest\|query\|lint\|feature\|bug \| Title` (grep-parseable) |
| Auto-refresh trigger | Existing skills call `/wiki-status` and `/wiki-qa-refresh` on completion |

## Data Model

No database changes. File-based only. Wiki page frontmatter:

```yaml
---
type: entity | concept | source | project | decision | synthesis
tags: [...]
created: 2026-04-12
updated: 2026-04-12
source_ids: [tolkien-gateway-2024, liz-interview-2026-03-15]
confidence: low | medium | high
---
```

`sources/` pages additionally carry `raw_path:` pointing to `raw/<filename>`.

## Integration Points

**New skills** (see task breakdown):
- `/ingest <path-or-url>` — read + file + propagate + log
- `/wiki-query <question>` — index-first lookup + citations + optional file-back
- `/wiki-lint` — health check + status.md refresh
- `/wiki-status` — regenerate status.md from live state
- `/wiki-qa-refresh` — regenerate qa-queue.md from tickets + features
- `/run-wiki-chat` — launch Liz's Streamlit chat app

**Modified skills** (retarget or add wiki hooks):
- `/update-docs` — retarget `docs/**` → `wiki/project/**`
- `/plan-feature` — also create/update `wiki/concepts/<topic>.md` for the feature
- `/nextstep` — append to `wiki/log.md`; call `/wiki-status` on feature completion
- `/ship` — doc sweep now targets `wiki/project/**`; refresh qa-queue when ticket→testing
- `/deploy-prod` — on success, mark tickets `deployed` and refresh qa-queue with prod URL
- `/fix-bug`, `/log-bug` — append to log; propose concept page when bug reveals domain insight

**Deleted**: `docs/`, `plan/` (content migrated, no stubs).

**Updated**: `CLAUDE.md` references (`docs/endpoints.md` → `wiki/project/endpoints.md`, etc.).

## Phased Rollout

| Phase | Deliverable |
|---|---|
| **A. Scaffold** | Empty `wiki/` tree, `WIKI.md` schema, `.claude/rules/wiki.md`, qmd installed and indexed |
| **B. Manifest** | Classify every existing `.md` file (entity/concept/source/project/decision/skip); review with user |
| **C. Migrate** | `docs/**` → `wiki/project/**`; `plan/**` → `wiki/decisions/**`; update CLAUDE.md refs; delete `docs/` + `plan/` |
| **D. Synthesize** | Generate initial entity/concept/decision pages from CLAUDE.md, intake/, brightstep_process/, features/roadmap.md |
| **E. New skills** | `/ingest`, `/wiki-query`, `/wiki-lint`, `/wiki-status`, `/wiki-qa-refresh` |
| **F. Modify skills** | Retarget `/update-docs`; hook wiki writes into `/nextstep`, `/ship`, `/deploy-prod`, `/fix-bug`, `/log-bug`, `/plan-feature` |
| **G. Chat app** | Streamlit wiki-chat app + `/run-wiki-chat` skill (local only, future: hosted) |
| **H. Demo ingest** | End-to-end first real ingest + dogfood `/wiki-query` against it |

## Manual Testing Checklist

- [ ] `wiki/` vault opens cleanly in Obsidian; graph view shows cross-links
- [ ] qmd CLI returns relevant pages for a test query
- [ ] qmd MCP server callable from Claude Code
- [ ] Every migrated `docs/` page is reachable in `wiki/project/`; no content loss
- [ ] `CLAUDE.md` references resolve (grep for `docs/` returns zero hits)
- [ ] `/ingest` on a sample article creates `sources/` page, updates ≥1 entity/concept, appends to `log.md`, updates `index.md`
- [ ] `/wiki-query` answers a test question with citations pointing to real pages
- [ ] `/wiki-lint` flags at least one orphan/contradiction on purpose-seeded test data
- [ ] `/wiki-status` reflects current `features/inprogress/` and open tickets accurately
- [ ] `/wiki-qa-refresh` produces a `qa-queue.md` listing every ticket in `testing`/`deployed` status
- [ ] After `/ship` completes, `qa-queue.md` and `log.md` reflect it without manual action
- [ ] `/run-wiki-chat` starts Streamlit app on localhost; chat answers with wiki citations
- [ ] Liz walkthrough: open `for-liz.md` → click into `qa-queue.md` → open chat → ask "what's ready to test?" → get grounded answer

## Tasks

Generated 2026-04-12 into `backlog/`. Range: **247–279** (33 tasks). Tier mix: **8 Haiku / 19 Sonnet / 6 Opus**.

**Phase A — Scaffold**: 247 (H) scaffold · 248 (O) WIKI.md schema · 249 (H) path-scoped rule · 250 (S) install qmd
**Phase B — Manifest**: 251 (S) manifest · 252 (H) user review gate
**Phase C — Migrate**: 253 (S) docs→project · 254 (S) plan→decisions · 255 (H) update refs · 256 (H) delete docs+plan
**Phase D — Synthesize**: 257 (S) entities · 258 (S) intake concepts · 259 (S) stack concepts · 260 (S) workflow · 261 (O) index/log/status/for-liz
**Phase E — New skills**: 262 (O) /ingest · 263 (O) /wiki-query · 264 (S) /wiki-lint · 265 (S) /wiki-status · 266 (S) /wiki-qa-refresh · 267 (H) register in CLAUDE.md
**Phase F — Modify skills**: 268 (S) /update-docs · 269 (S) /plan-feature · 270 (S) /nextstep · 271 (S) /ship · 272 (S) /deploy-prod · 273 (S) /fix-bug+/log-bug
**Phase G — Chat app**: 274 (O) UI scaffold · 275 (O) Claude API + caching · 276 (S) /run-wiki-chat · 277 (H) docs
**Phase H — Dogfood**: 278 (S) /ingest end-to-end · 279 (H) /wiki-query end-to-end

## Open Questions

- **Auto-refresh performance**: if `/nextstep` hooks `/wiki-status` on every task completion, does it slow the autorunner noticeably? Fallback: debounce to once per feature completion.
- **qmd MCP configuration**: does qmd's MCP server work from Claude Code's MCP config, or do we shell out to the CLI? Decide in Phase A.
- **Streamlit hosting**: local-only for now. Decide hosted path (Streamlit Cloud vs Vercel+Clerk) when Liz asks for async access.
- **Concept-page auto-creation threshold**: does `/plan-feature` always create a concept page, or only when the feature introduces a new domain concept? Current plan: always, can be pruned by `/wiki-lint`.
