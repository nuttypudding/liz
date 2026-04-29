---
name: update-docs
description: Scan git diff for changed files and update all affected documentation. Use after making code changes to keep docs in sync.
---

# /update-docs — Documentation Sync

## Process

### 1. Identify Changes

```bash
git diff --name-only HEAD
git diff --cached --name-only
```

### 2. Analyze Impact

Launch an Explore agent to cross-reference changes against this mapping:

| Change Type | Docs to Update |
|-------------|---------------|
| API/endpoint changes | `docs/api.md` |
| Data schema changes | `docs/schema.md` |
| Infrastructure/deploy | `docs/runbook.md` |
| Feature changes | `features/roadmap.md` |
| Architecture decisions | `plan/DECISION_LOG.md` |
| Plan section changes | `plan/README.md` TOC |
| Env var changes | `.env.example` + referencing docs |
| Intake format changes | Intake schema docs in `AGENTS.md` |

### 3. Apply Updates

Edit each affected doc to reflect the current state. Do not add speculative content — only document what exists.

### 4. Report

List which docs were updated and why.
