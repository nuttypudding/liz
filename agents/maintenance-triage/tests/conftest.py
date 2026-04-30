import pytest
from fastapi.testclient import TestClient

TEST_SECRET = "test-secret-for-pytest"


@pytest.fixture(autouse=True)
def _shared_secret_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENT_SHARED_SECRET", TEST_SECRET)


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
