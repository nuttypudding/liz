---
type: project
tags: [search, wiki, tools]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# qmd Search Installation & Usage

This page documents the setup and use of [qmd](https://github.com/tobi/qmd) — a hybrid BM25 + vector + LLM rerank markdown search engine for the Liz wiki. See `wiki/WIKI.md` § 10 for integration context.

## Installation

### Prerequisite: Node.js

qmd requires Node.js 18+ (installed via Homebrew, NVM, or your OS package manager).

```bash
# Verify Node.js is available
node --version  # Should output v18+ or v20+
npm --version
```

### Install qmd globally

Once Node.js is available:

```bash
npm install -g @tobilu/qmd
```

Verify installation:

```bash
qmd --version
```

### Alternative: Run via npx (no global install)

If you prefer not to install globally:

```bash
npx @tobilu/qmd search "your query"
npx @tobilu/qmd index wiki/
```

## Indexing the Wiki

Index the wiki once after installation or after bulk page additions:

```bash
cd /path/to/liz
qmd index wiki/
```

This creates a SQLite index (`wiki/.qmd/` or similar, check qmd docs). Add qmd artifacts to `.gitignore`:

```gitignore
# qmd search index
wiki/.qmd/
wiki/*.db
```

## Searching from the CLI

Once indexed:

```bash
qmd search "Clerk roles"
```

Returns matching `wiki/**` pages ranked by BM25 + LLM reranking.

## MCP Integration (Claude Code)

If qmd's MCP server is configured in Claude Code's MCP settings (`.claude.json` or project `settings.json`), the `/wiki-query` skill can call qmd natively without shelling out.

**Current status**: MCP integration is deferred pending environment availability. Use CLI fallback below.

## CLI Fallback: grep-based Search

If qmd is not yet installed (Node.js unavailable), use a simple grep fallback:

```bash
# Search for a term in wiki pages (case-insensitive)
grep -r --include="*.md" -i "clerk roles" wiki/

# Search with line numbers
grep -r --include="*.md" -in "urgency triage" wiki/

# Search frontmatter only
grep -r "^tags:" wiki/ | grep "maintenance"
```

This is a temporary measure — it's slower and less intelligent than qmd but provides basic search functionality without additional dependencies.

## When qmd Becomes Available

Once Node.js is installed:

1. Install qmd: `npm install -g @tobilu/qmd`
2. Index: `qmd index wiki/`
3. Test: `qmd search "test query"`
4. Remove grep references from `/wiki-query` code
5. Enable qmd MCP integration in Claude Code settings (if applicable)

## Troubleshooting

### `qmd: command not found`

- Verify `npm list -g @tobilu/qmd` shows the package
- Check `npm config get prefix` to find where global packages are installed
- Ensure that directory is in your `$PATH`

### Index is stale

- Reindex after bulk changes: `qmd index wiki/`
- qmd watches file changes in some modes; check current docs for auto-indexing behavior

### MCP integration not working

- Verify qmd is installed: `qmd --version`
- Check Claude Code MCP configuration (see `CLAUDE.md` for current conventions)
- Fallback to CLI: `qmd search "query"`

## References

- [qmd GitHub](https://github.com/tobi/qmd)
- [Liz WIKI.md § 10 qmd Integration](../../WIKI.md#10-qmd-integration)
