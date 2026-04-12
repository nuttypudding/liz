---
paths:
  - "wiki/**"
---

# Wiki Rules

When editing files in `wiki/`:

1. **Consult `wiki/WIKI.md`** for the canonical schema, page types, frontmatter fields, and workflows. It is the authoritative reference for all wiki conventions.

2. **Frontmatter is required**: Every page must have YAML frontmatter with `type`, `tags`, `created`, `updated`, and `confidence`. Source pages require `raw_path`, `raw_type`, and `ingested_by`. Decision pages require `status`.

3. **Citations**: Every non-obvious claim must cite at least one `[[sources/...]]` page using wikilinks. Source pages themselves cite nothing — they are the terminus.

4. **Index maintenance**: When creating or renaming a wiki page, update `index.md` to keep the catalog current. Entries are alphabetically sorted within type sections.

5. **Log format**: Append an entry to `log.md` for every wiki-modifying operation (ingest, query, lint, feature, bug, status, qa). Format: `## [YYYY-MM-DD] <category> | <title>` followed by a bulleted summary.

6. **Plain language boundary**: Only `for-liz.md` and `qa-queue.md` are plain-language. All other pages stay technical — use precise terminology, assume developer audience.
