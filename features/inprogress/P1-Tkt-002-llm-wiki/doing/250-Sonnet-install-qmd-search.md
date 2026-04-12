---
id: 250
title: Install qmd search + configure MCP
tier: Sonnet
depends_on: [247]
feature: llm-wiki
---

# 250 — Install qmd search + configure MCP

## Objective
Install [qmd](https://github.com/tobi/qmd), index `wiki/`, and expose it to Claude Code via MCP so `/wiki-query` can shell out or call it natively.

## Context
qmd is a local markdown search engine (hybrid BM25 + vector + LLM rerank). It has both a CLI and an MCP server. See feature plan § Tech Approach.

## Implementation
1. Install qmd per upstream instructions (likely `brew install tobi/tap/qmd` or `cargo install qmd` — verify current method from the repo README at install time).
2. Initialize a qmd index over `wiki/**`: `qmd index wiki/` (or equivalent per current CLI).
3. Configure qmd's MCP server in the appropriate Claude Code MCP config (`~/.claude.json` or project `.mcp.json` — check current convention). If MCP setup proves fragile, document the CLI fallback (`qmd search "query"`) instead.
4. Smoke-test: run a search for "Clerk" or "maintenance" and verify wiki pages are returned.
5. Document the install + usage steps in `wiki/project/workflow/qmd-search.md` (create new page) — install command, index command, query command, MCP config snippet, troubleshooting.
6. Add qmd to `.gitignore` for any local index artifacts it writes (check what qmd creates).

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] `qmd --version` returns successfully
3. [ ] `qmd search` returns relevant `wiki/**` pages for a test query
4. [ ] MCP server callable from Claude Code OR CLI fallback documented with working example
5. [ ] `wiki/project/workflow/qmd-search.md` documents install + usage
6. [ ] qmd local artifacts (if any) are gitignored
