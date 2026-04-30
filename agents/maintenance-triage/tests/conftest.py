import pytest
from fastapi.testclient import TestClient

TEST_SECRET = "test-secret-for-pytest"


@pytest.fixture(autouse=True)
def _agent_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Pin the agent's env to a known baseline before each test.

    AGENT_SHARED_SECRET must be set so requests can authenticate.
    OPENROUTER_API_KEY and AGENT_TRIAGE_MODEL must be UNSET so tests that
    exercise the stub path don't accidentally hit the real LLM and tests
    that exercise the live path opt in via monkeypatch.setenv. Without
    this guard, running `uv run --env-file .env.local pytest` (or any
    dev shell with these exported) silently changes test behavior.
    """
    monkeypatch.setenv("AGENT_SHARED_SECRET", TEST_SECRET)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("AGENT_TRIAGE_MODEL", raising=False)


@pytest.fixture(autouse=True)
def _reset_openrouter_client() -> None:
    """Clear the cached AsyncOpenAI singleton between tests so each test
    sees the env var state set up by its own monkeypatch fixture."""
    from src.api import _reset_openrouter_client_for_tests

    _reset_openrouter_client_for_tests()
    yield
    _reset_openrouter_client_for_tests()


@pytest.fixture
def secret() -> str:
    return TEST_SECRET


@pytest.fixture
def client() -> TestClient:
    from src.api import app

    return TestClient(app)


@pytest.fixture
def auth_headers(secret: str) -> dict[str, str]:
    return {"X-Agent-Auth": secret}
