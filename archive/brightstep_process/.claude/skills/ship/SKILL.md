---
name: ship
description: Run tests, create missing unit tests, update affected docs, stage changes, and commit. The safe way to commit your work.
disable-model-invocation: true
argument-hint: "[commit message]"
---

# Ship

Run tests, create missing unit tests, update documentation, and commit. This skill is user-invoked only — it never runs automatically.

## Step 1: Identify Changes

Check what changed:
```bash
git diff --name-only HEAD
git diff --name-only --cached
```

Categorize the changed files:
- **Python source** (`src/**/*.py`) — needs pytest
- **TypeScript source** (`apps/**/*.{ts,tsx}`) — needs build check
- **Config/infrastructure** (`.env*`, `docker-compose.yml`, `infrastructure/*`) — may need doc updates
- **Tests** (`tests/**`) — run them directly
- **Docs** (`docs/**`, `plan/**`) — verify consistency

## Step 2: Analyze Test Coverage (Parallel with Step 3)

Spawn an **Explore agent** to analyze test coverage for changed source files:

> "Analyze test coverage opportunities for these changed files: `<list of changed src files>`.
>
> For each changed source file:
> 1. Check if a corresponding test file exists in `tests/` (e.g., `src/brightstep/foo/bar.py` → `tests/test_bar.py`)
> 2. If a test file exists, read both the source and test files. Identify any **new or modified functions/classes/methods** in the source that lack corresponding test cases in the existing test file.
> 3. If no test file exists, identify which functions/classes are **unit-testable** (pure logic, data transformations, validators, parsers, config — NOT external service calls, DB queries, or LLM interactions that need mocking infra not yet present).
>
> For each testable gap found, return:
> - Source file and function/class name
> - What the test should verify (expected behavior, edge cases)
> - Whether it needs a new test file or additions to an existing one
> - Whether it can be tested with simple assertions or needs mocks/fixtures
>
> Skip these — they are NOT worth unit testing in this pass:
> - Functions that only call external services (DB, LLM, Redis, HTTP) with no local logic
> - Thin wrappers or re-exports
> - CLI entry points (already tested by integration tests)
> - Files that only changed imports or formatting
>
> Return a structured list of test opportunities, ordered by value (pure logic first, then validators, then config)."

## Step 3: Run Existing Tests + Analyze Docs (Parallel with Step 2)

**Background: Test suite** — Run tests via Bash with `run_in_background: true`:
```bash
# Python (if .py files changed)
python3 -m pytest tests/ -v

# TypeScript (if .ts/.tsx files changed)
npm run build --prefix apps/<app>
```

**Parallel: Doc analysis agent** — Spawn an Explore agent to check doc impact:
> "Analyze these changed files for documentation impact: `<list>`.
> Check against: cli→cli-usage.md, infrastructure→runbook.md, agents→architecture.md, db→schema.md, plan→README.md TOC, arch decisions→DECISION_LOG.md, feature status changes→features/roadmap.md.
> Cross-reference ports (docker-compose.yml vs .env.example vs docs), CLI commands (docs vs src/brightstep/cli/main.py), env vars (docs vs .env.example).
> Return: which docs need updates and what to change."

## Step 4: Create Missing Tests

Review the test coverage analysis from Step 2. For each identified gap:

1. **Skip if not worth it** — Don't create tests for trivial getters, re-exports, or functions that only delegate to external services. Don't create tests that would just duplicate existing integration tests.

2. **Create or extend test files** following project conventions:
   - Test file naming: `tests/test_<module_name>.py`
   - Use `pytest` + `monkeypatch` for env vars, `unittest.mock.patch` for dependencies
   - Class-based grouping: `class TestClassName:` with `test_` method names
   - Each test should have a docstring explaining what it verifies
   - Use `assert` statements (not `self.assert*`)
   - For async code, use `@pytest.mark.asyncio` + `async def test_*`

3. **Run the new tests** to verify they pass:
   ```bash
   python3 -m pytest tests/test_<new_or_modified>.py -v
   ```

4. **If no gaps found**, skip this step and note "No new tests needed" in the report.

**Check test results from Step 3 before proceeding. If tests fail, stop and report. Do not commit broken code.**

## Step 5: Apply Doc Updates

Review the doc analysis results from Step 3 and apply any needed documentation updates.

## Step 6: Stage and Commit

Stage all relevant files (be specific — don't use `git add -A`):
```bash
git add <specific-files>
```

Create the commit using the message from `$ARGUMENTS`. If no message was provided, draft one based on the changes:
- Summarize the "why" not the "what"
- Keep the first line under 72 characters
- Add the co-authored-by trailer

```bash
git commit -m "$(cat <<'EOF'
<commit message>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

## Step 7: Report

Show:
- Test results (pass/fail count, any pre-existing failures noted)
- New tests created (file names + what they cover)
- Documentation updates made
- Files committed
- Commit hash

**Do not push to remote unless explicitly asked.**
