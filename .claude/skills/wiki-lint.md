---
name: wiki-lint
description: Health-check the wiki — orphans, broken links, stale claims, contradictions, index drift, frontmatter violations
user_invocable: true
---

# /wiki-lint — Wiki health check

Non-destructive report. Does not auto-fix except for regenerations (`/wiki-status` and `/wiki-qa-refresh`). Idempotent — safe to run repeatedly.

## Checks

1. **Orphan pages** — pages with no inbound `[[wikilinks]]`. Root pages (`index`, `log`, `status`, `for-liz`, `qa-queue`, `WIKI`) are exempt.

2. **Broken wikilinks** — `[[target]]` pointing at non-existent pages.

3. **Stale claims** — pages whose `updated:` frontmatter is older than 30 days AND whose cited `[[sources/...]]` have newer `updated:` dates.

4. **Contradictions** — pages containing `⚠️ conflict:` markers left unresolved from `/ingest`.

5. **Missing concept pages** — terms appearing ≥3 times across `entities/` and `sources/` but having no `concepts/<term>.md`.

6. **Index drift** — pages on disk absent from `wiki/index.md`, or `index.md` entries pointing to non-existent pages.

7. **Frontmatter violations** — missing required fields per `WIKI.md` schema (per type: entity/concept/source/project/decision/synthesis).

8. **Refresh derived views** — invoke `/wiki-status` and `/wiki-qa-refresh` at the end of the lint (regenerations are not "edits", they're recomputations).

## Output

### User summary (console)

```
Wiki lint — 2026-04-12
  3 orphans: [[concepts/foo]], [[sources/bar]], [[entities/baz]]
  1 broken wikilink: [[entities/qux]] in concepts/the-core-four.md
  0 stale claims
  2 unresolved conflicts: [[concepts/confidence-scoring]], [[entities/tenant]]
  1 missing concept suggestion: "fair housing" (appears in 4 sources)
  0 index drift
  0 frontmatter violations
  ✓ status.md refreshed
  ✓ qa-queue.md refreshed
```

### Log entry

```
## [YYYY-MM-DD] lint | N issues found
- Orphans: <count> → [[...]]
- Broken wikilinks: <count> → <details>
- Unresolved conflicts: <count> → [[...]]
- Missing concept suggestions: <list>
- Status + QA refreshed: ✓
```

## What this skill does NOT do

- Does not auto-remove orphan pages (user decides — they may be intentional roots for future content).
- Does not auto-fix broken wikilinks (may be forward references to pages not yet created).
- Does not resolve contradictions (only the user/author can).

## Implementation notes

- Use `qmd` or ripgrep to find wikilink targets and count reference frequency.
- Frontmatter parsing: simple YAML front-delimited by `---` / `---`.
- Idempotent: running twice in a row produces identical log entries only on the *second* run's actual state (i.e. first run's refreshes may have changed things).
