---
name: ship
description: Run tests, create missing unit tests, update affected docs, stage changes, and commit. The safe way to commit your work. User-invoked only.
---

# /ship — Safe Commit Workflow

The commit message is: `$ARGUMENTS`

If no message provided, ask the user for one.

## Steps

### 1. Identify Changes

```bash
git diff --name-only HEAD
git diff --cached --name-only
git status --short
```

Categorize changed files: Python, TypeScript, config, tests, docs, data.

### 2. Run Existing Tests

Run whatever test suite exists for the project. If no tests exist yet, note it and continue.

- Python: `.venv/bin/pytest tests/` (if tests/ exists)
- Node: `npm test` (if package.json has test script)

If tests fail, STOP and report. Do not commit broken code.

### 3. Analyze Test Coverage

Use an Explore agent to scan changed source files and identify functions/modules that lack unit tests. Skip trivial changes (config, docs, data files).

### 4. Create Missing Tests

For each gap found, write a test. Use the project's existing test conventions. If no tests exist yet, create the test directory and initial test file.

### 5. Check Documentation

Use an Explore agent to check if any changed files require documentation updates. Reference the doc-mapping:

| Change Type | Docs to Update |
|-------------|---------------|
| API/backend changes | `docs/api.md` |
| Schema/data changes | `docs/schema.md` |
| Infrastructure | `docs/runbook.md` |
| Feature changes | `features/roadmap.md` |
| Architecture | `plan/README.md`, `plan/DECISION_LOG.md` |

Apply updates if needed.

### 6. Stage and Commit

```bash
git add <specific files>
git commit -m "<message>"
```

Stage specific files — never `git add -A`. Do NOT push unless the user asks.

### 7. Report

Summary of:
- Tests run (pass/fail counts)
- New tests created
- Docs updated
- Files committed
