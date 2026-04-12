---
id: 253
title: Migrate docs/ to wiki/project/
tier: Sonnet
depends_on: [252]
feature: llm-wiki
---

# 253 — Migrate docs/ to wiki/project/

## Objective
Move every file under `docs/` to its manifest-assigned location under `wiki/project/`, preserving content and adding wiki frontmatter + wikilinks.

## Context
`docs/` contains: `endpoints.md`, `testing-framework.md`, `testing-guides/` (10 files), `ui-process.md`.

## Implementation
1. For each row in the frozen manifest classified as `project`:
   - Read source file
   - Add YAML frontmatter per WIKI.md schema (`type: project`, `created`, `updated`, `tags`)
   - Convert any `[text](docs/other.md)` links to Obsidian wikilinks `[[project/other]]`
   - Replace any `docs/` path references in body text with `wiki/project/`
   - Write to destination under `wiki/project/**`
2. Verify destination file count matches source file count.
3. DO NOT delete `docs/` yet — task 256 owns deletion after all migrations complete and refs are updated.

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] Every `docs/**` file has a counterpart in `wiki/project/**`
3. [ ] Each migrated file has valid YAML frontmatter
4. [ ] Internal links rewritten to wikilinks
5. [ ] Original `docs/` still intact (deletion is task 256)
