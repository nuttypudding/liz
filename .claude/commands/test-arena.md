---
description: Run comprehensive unit and UI tests for the Arena feature
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

## Cost-Saving Tips for Real API Testing

When testing with actual API keys, **always use the cheapest models** to minimize cost:

| Provider | Cheapest Model | Input/Output per 1M tokens |
|----------|---------------|---------------------------|
| **Groq** | meta-llama/llama-4-scout | $0.11 / $0.34 |
| **Google** | gemini-2.5-flash | $0.15 / $0.60 |
| **OpenAI** | gpt-4o-mini | $0.15 / $0.60 |
| **Anthropic** | claude-haiku-4.5 | $0.80 / $4.00 |

**Guidelines:**
- Select only 2-3 samples when testing (don't run all 100)
- Use `gpt-4o-mini`, `gemini-2.5-flash`, and `meta-llama/llama-4-scout` as default test models
- Avoid tier-1 models (`gpt-4o`, `claude-sonnet-4`, `gemini-2.5-pro`) for routine testing
- A typical 3-sample x 3-model test run costs < $0.01

## Required Environment Variables

The `.env` file at project root must contain:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
GROQ_API_KEY=gsk_...
```

Not all keys are required — the arena gracefully handles missing providers by showing `[ERROR]` in result cells.

## Prerequisites

If tests fail with import errors, ensure dependencies are installed:
```bash
cd /Users/noelcacnio/repo/liz
source .venv/bin/activate
pip install -e packages/shared
pip install streamlit pydantic pyyaml pillow pytest playwright requests
pip install openai anthropic google-genai groq python-dotenv
playwright install chromium
```
