---
name: test-all
description: Run all tests — unit, integration, and frontend UI (Playwright) — for the IKIGAI chat system.
argument-hint: "[unit|integration|ui|all]"
---

# Test All

Run unit tests, backend integration tests, and frontend Playwright UI tests. Reports results for each tier and provides a summary.

## Arguments

`$ARGUMENTS` controls which test tiers to run:
- `unit` — Unit tests only (pytest)
- `integration` — Backend E2E tests only (requires live backend on :8100)
- `ui` — Playwright browser tests only (requires live backend + both UIs)
- (empty or `all`) — All three tiers

## Step 1: Parse Arguments & Check Prerequisites

Determine which tiers to run from `$ARGUMENTS` (default: all).

Run prerequisite checks **in parallel**:

```bash
# Check backend is running
curl -sf http://localhost:8100/health > /dev/null 2>&1 && echo "Backend: UP" || echo "Backend: DOWN"
```

```bash
# Check Gradio UI (only needed for UI tests)
curl -sf -o /dev/null http://localhost:7861/ && echo "Gradio: UP" || echo "Gradio: DOWN"
```

```bash
# Check Streamlit UI (only needed for UI tests)
curl -sf -o /dev/null http://localhost:8501/ && echo "Streamlit: UP" || echo "Streamlit: DOWN"
```

If a required service is down:
- For `unit` tests — no services needed, proceed anyway
- For `integration` tests — backend must be running; if not, print instructions and skip
- For `ui` tests — all three must be running; if not, print startup commands and skip

Startup commands to show the user if services are down:
```
# Backend
.venv/bin/uvicorn brightstep.backends.student.app:app --host 0.0.0.0 --port 8100 &

# Gradio UI
.venv/bin/python samples/chat_gradio_ikigai.py &

# Streamlit UI
.venv/bin/streamlit run samples/chat_streamlit_ikigai.py --server.port 8501 --server.headless true &
```

## Step 2: Run Unit Tests

If tier includes `unit`:

```bash
python3 -m pytest tests/ -v --ignore=tests/e2e/ -x --tb=short 2>&1
```

Capture the exit code. Report pass/fail count.

**Important**: Unit tests use the test database (`brightstep_test`) via conftest.py. They do NOT need a live backend.

## Step 3: Run Integration Tests

If tier includes `integration` AND backend is running:

```bash
.venv/bin/python tests/e2e/test_chat_backend.py 2>&1
```

This runs ~75 tests covering:
- Backend health & SSE streaming
- Multi-turn conversation (5 turns)
- Session CRUD + profile storage
- IKIGAI matching algorithm with real data
- Scholarship search
- University lookup
- Streamlit & Gradio helper functions
- Action plan generation

Capture the exit code. Report pass/fail count.

## Step 4: Run Frontend UI Tests

If tier includes `ui` AND all three services are running:

```bash
.venv/bin/python tests/e2e/test_ui_playwright.py 2>&1
```

This runs ~36 Playwright headless Chromium tests covering:
- **Gradio** (port 7861): page load, UI elements (header, welcome, progress panel, suggestions, dimensions, About IKIGAI), suggestion click + bot response, custom message + bot response, no raw list rendering, progress bar updates
- **Streamlit** (port 8501): page load, sidebar progress, suggestion buttons, live backend connection, suggestion click + bot response, no raw JSON state, chat input, progress bar updates

Screenshots saved to `/tmp/gradio-final.png` and `/tmp/streamlit-final.png`.

Capture the exit code. Report pass/fail count.

## Step 5: Report Summary

Print a combined summary:

```
========================================
TEST SUMMARY
========================================
  Unit tests:        XX passed, X failed
  Integration tests: XX passed, X failed
  UI tests:          XX passed, X failed
  ----------------------------------------
  Total:             XX passed, X failed
========================================
```

If any tier was skipped (service down), note it:
```
  UI tests:          SKIPPED (Gradio not running)
```

If any tests failed, print the failure details from each tier.

If all tests passed, print a success message.

**Do NOT auto-fix failures.** Just report them clearly so the user can decide what to do.
