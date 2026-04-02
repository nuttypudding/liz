---
paths:
  - "src/**/*.py"
---

# Python Backend Rules

When editing Python source files in `src/`:

## Environment

0. **Always use the venv**: All Python commands must use `.venv/bin/python`, `.venv/bin/pip`, `.venv/bin/pytest`, etc. Never use system Python or install packages globally. Subagents must also use the venv path.

## Architecture

1. **DDD bounded contexts**: Each subdirectory under `src/brightstep/` represents a bounded context or module. Don't import across contexts without going through their public API (typically the module's `__init__.py` exports).

2. **Configuration**: Always use `get_settings()` from `src/brightstep/config.py` for all config values. Never hardcode connection strings, URLs, ports, or API keys. Never read `os.environ` directly.

3. **Agent pattern**: All agents subclass `ChatAgent` from Microsoft Agent Framework. They auto-emit OpenTelemetry spans when `ENABLE_INSTRUMENTATION=true`. Add custom spans via `get_tracer(__name__)` for non-trivial operations.

## Key Lessons (from production debugging)

4. **asyncpg bind params** (L03): Never use `::type` casts on bind parameters in raw SQL with asyncpg. Write `:vec` not `:vec::vector` — asyncpg misparses `::` as a new parameter prefix. Let pgvector operators handle type inference.

5. **OTEL singletons** (L05, L07): `TracerProvider` can only be set once per process. In tests, create provider at module level, use `exporter.clear()` between tests. New test modules should `add_span_processor()` to the existing provider, not call `set_tracer_provider()`.

6. **httpx keepalive** (L18): For long-running batch operations against TRT-LLM, disable keepalive: `httpx.Limits(max_keepalive_connections=0)`. TRT-LLM closes idle connections server-side, causing CLOSE-WAIT stalls.

7. **Qwen3 think tags** (L19): Strip `<think>...</think>` tags before parsing JSON from Qwen3: `re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()`.

8. **asyncpg datetime** (L13): Pass `datetime` objects directly to asyncpg, never `.isoformat()` strings. asyncpg's type system is strict.
