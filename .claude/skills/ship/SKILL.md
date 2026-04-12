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

### 5. Check Wiki

Delegate to `/update-docs` (now retargeted at `wiki/project/**`). That skill handles the full doc-mapping.

### 6. Stage and Commit

```bash
git add <specific files>
git commit -m "<message>"
```

Stage specific files — never `git add -A`. Do NOT push unless the user asks.

### 7. Wiki Hooks

After the commit succeeds:

- Append to `wiki/log.md`: `## [YYYY-MM-DD] ship | <commit-subject>` with a one-line diff summary.
- If the commit causes any ticket in `.claude/tickets.md` to transition to `testing` or `deployed`, invoke `/wiki-qa-refresh`.

### 8. Report

Summary of:
- Tests run (pass/fail counts)
- New tests created
- Docs updated
- Files committed
