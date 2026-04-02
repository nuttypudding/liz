---
name: test-arena
description: Run comprehensive unit and UI tests for the Arena feature
user_invocable: true
---

# /test-arena — Arena Test Suite Runner

Run the full Arena test suite: unit tests and Playwright UI tests.

## Instructions

1. **Kill any running Streamlit processes** to free ports:
   ```bash
   pkill -f "streamlit run" 2>/dev/null || true
   ```

2. **Run unit tests** from the project root:
   ```bash
   cd /Users/noelcacnio/repo/liz
   source .venv/bin/activate
   PYTHONPATH=packages/shared:apps/arena pytest apps/arena/tests/unit/ -v --tb=short
   ```

3. **Run UI tests** (requires Playwright browsers installed):
   ```bash
   cd /Users/noelcacnio/repo/liz
   source .venv/bin/activate
   PYTHONPATH=packages/shared:apps/arena pytest apps/arena/tests/ui/ -v --tb=short
   ```

4. **Report results**: Summarize pass/fail counts for both suites. If any tests fail, investigate and fix the root cause before re-running.

## Arguments

- No arguments: runs both unit and UI tests
- `unit` — run only unit tests
- `ui` — run only UI tests

## Prerequisites

If tests fail with import errors, ensure dependencies are installed:
```bash
cd /Users/noelcacnio/repo/liz
source .venv/bin/activate
pip install -e packages/shared
pip install streamlit pydantic pyyaml pillow pytest playwright requests
playwright install chromium
```
