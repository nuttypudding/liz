---
name: update-docs
description: Scan git diff for changed files and update all affected wiki pages. Use after making code changes to keep the wiki in sync.
---

# /update-docs — Wiki Sync

## Process

### 1. Identify Changes

```bash
git diff --name-only HEAD
git diff --cached --name-only
```

### 2. Analyze Impact

Launch an Explore agent to cross-reference changes against this mapping:

| Change Type | Wiki Page to Update |
|-------------|---------------------|
| API/endpoint changes | `wiki/project/endpoints.md` |
| Data schema changes | `wiki/project/system-architecture.md` |
| Clerk/auth changes | `wiki/project/clerk-setup-guide.md`, `wiki/project/clerk-production-setup.md`, `wiki/concepts/clerk-roles.md` |
| Infrastructure/deploy | `wiki/project/endpoints.md`, relevant concept pages |
| Feature changes | `features/roadmap.md` (live), relevant `wiki/concepts/<topic>.md` |
| Architecture decisions | New page under `wiki/decisions/YYYY-MM-DD-<slug>.md` |
| Testing changes | `wiki/project/testing-framework.md`, relevant testing guides |
| Env var changes | `.env.example` + referencing wiki pages |
| Intake format changes | `wiki/concepts/intake-json-schema.md`, `wiki/concepts/maintenance-category-taxonomy.md` |

### 3. Apply Updates

Edit each affected wiki page to reflect the current state. Follow `wiki/WIKI.md` conventions — keep frontmatter `updated:` field current, add/remove wikilinks as needed.

If the change introduces a new domain concept (not just operational reference), **ask the user** before creating a new `wiki/concepts/<topic>.md` page. Don't auto-create.

### 4. Log

Append to `wiki/log.md`:

```
## [YYYY-MM-DD] docs-update | <commit-subject or one-line summary>
- Diff: <N files changed>
- Updated: [[project/foo]], [[concepts/bar]]
- New pages proposed: <list or none>
```

### 5. Report

List which wiki pages were updated and why.
