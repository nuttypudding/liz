"""Unit tests for the maintenance-triage agent.

Coverage map (mirrors the validation checklist in
features/planned/P4-001-agent-platform/POC.md):

Happy path:
- /v1/health is unauthenticated
- /v1/info reports name/version/model/openrouter_configured/capabilities
- /v1/run returns hello-world stub when OPENROUTER_API_KEY is unset
- /v1/run accepts empty messages array (stub path), default messages,
  every valid role, and ignores extra fields
- /v1/run with OPENROUTER_API_KEY set: model from request body overrides
  AGENT_TRIAGE_MODEL env, which overrides DEFAULT_MODEL

Unhappy path (auth):
- /v1/info and /v1/run reject missing, empty, or wrong X-Agent-Auth (401)
- Auth precedes body validation

Unhappy path (validation):
- 422 on invalid role enum, missing role/content, wrong type, malformed JSON

Unhappy path (LLM):
- /v1/run with OPENROUTER_API_KEY set + empty messages → 422
- /v1/run with OPENROUTER_API_KEY set + LLM raises APIError → 502

Edge:
- /v1/health works even without AGENT_SHARED_SECRET in env
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ---------- Happy path ----------


def test_health_no_auth_required(client: TestClient) -> None:
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_info_with_valid_auth(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/v1/info", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "maintenance-triage"
    assert body["version"] == "0.0.2"
    assert body["model"] == "anthropic/claude-sonnet-4-6"
    assert body["openrouter_configured"] is False
    assert body["capabilities"] == ["text"]


def test_info_reports_openrouter_configured_when_key_set(
    client: TestClient, auth_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    response = client.get("/v1/info", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["openrouter_configured"] is True


def test_info_reports_resolved_model_from_env(
    client: TestClient, auth_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENT_TRIAGE_MODEL", "openai/gpt-5")
    response = client.get("/v1/info", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["model"] == "openai/gpt-5"


def test_run_returns_stub_when_no_openrouter_key(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/run",
        headers=auth_headers,
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["message"].startswith("hello world")
    assert body["model"] == "stub"
    assert body["agent"] == "maintenance-triage"
    assert body["version"] == "0.0.2"


def test_run_stub_accepts_empty_messages(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post("/v1/run", headers=auth_headers, json={"messages": []})
    assert response.status_code == 200
    assert response.json()["model"] == "stub"


def test_run_stub_accepts_missing_messages(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post("/v1/run", headers=auth_headers, json={})
    assert response.status_code == 200


def test_run_accepts_each_valid_role(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    for role in ("system", "user", "assistant"):
        response = client.post(
            "/v1/run",
            headers=auth_headers,
            json={"messages": [{"role": role, "content": "x"}]},
        )
        assert response.status_code == 200, f"role={role} should be accepted"


def test_run_ignores_extra_fields(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/run",
        headers=auth_headers,
        json={
            "messages": [{"role": "user", "content": "x", "metadata": "ignored"}],
            "trace_id": "tr_123",
        },
    )
    assert response.status_code == 200


# ---------- Happy path: real OpenRouter call (mocked) ----------


def _mock_completion(content: str, model: str) -> MagicMock:
    """Build a minimal mock OpenAI ChatCompletion response."""
    completion = MagicMock()
    completion.model = model
    completion.usage = MagicMock(
        prompt_tokens=10, completion_tokens=20, total_tokens=30
    )
    choice = MagicMock()
    choice.message.content = content
    choice.finish_reason = "stop"
    completion.choices = [choice]
    return completion


def test_run_calls_openrouter_when_key_set(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    mock_create = AsyncMock(
        return_value=_mock_completion(
            "Plumbing emergency. Dispatch immediately.",
            "anthropic/claude-sonnet-4-6",
        )
    )
    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", mock_create
    ):
        response = client.post(
            "/v1/run",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "leak in basement"}],
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Plumbing emergency. Dispatch immediately."
    assert body["model"] == "anthropic/claude-sonnet-4-6"
    assert body["usage"]["total_tokens"] == 30
    assert body["finish_reason"] == "stop"
    # Verify it was called with the resolved model
    call_args = mock_create.call_args
    assert call_args.kwargs["model"] == "anthropic/claude-sonnet-4-6"
    assert call_args.kwargs["messages"] == [
        {"role": "user", "content": "leak in basement"}
    ]


def test_run_request_model_overrides_env_default(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    monkeypatch.setenv("AGENT_TRIAGE_MODEL", "anthropic/claude-sonnet-4-6")
    mock_create = AsyncMock(return_value=_mock_completion("ok", "openai/gpt-5"))
    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", mock_create
    ):
        response = client.post(
            "/v1/run",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "hi"}],
                "model": "openai/gpt-5",  # request override
            },
        )
    assert response.status_code == 200
    assert mock_create.call_args.kwargs["model"] == "openai/gpt-5"


def test_run_env_model_overrides_default_when_no_request_override(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    monkeypatch.setenv("AGENT_TRIAGE_MODEL", "google/gemini-2.5-pro")
    mock_create = AsyncMock(
        return_value=_mock_completion("ok", "google/gemini-2.5-pro")
    )
    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", mock_create
    ):
        response = client.post(
            "/v1/run",
            headers=auth_headers,
            json={"messages": [{"role": "user", "content": "hi"}]},
        )
    assert response.status_code == 200
    assert mock_create.call_args.kwargs["model"] == "google/gemini-2.5-pro"


# ---------- Unhappy path: auth ----------


def test_info_rejects_missing_auth(client: TestClient) -> None:
    response = client.get("/v1/info")
    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "unauthorized",
            "message": "missing or invalid X-Agent-Auth header",
        }
    }


def test_info_rejects_wrong_secret(client: TestClient) -> None:
    response = client.get("/v1/info", headers={"X-Agent-Auth": "definitely-wrong"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_info_rejects_empty_secret(client: TestClient) -> None:
    response = client.get("/v1/info", headers={"X-Agent-Auth": ""})
    assert response.status_code == 401


def test_run_rejects_missing_auth(client: TestClient) -> None:
    response = client.post("/v1/run", json={"messages": []})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_run_rejects_wrong_secret(client: TestClient) -> None:
    response = client.post(
        "/v1/run",
        headers={"X-Agent-Auth": "wrong"},
        json={"messages": []},
    )
    assert response.status_code == 401


def test_auth_checked_before_body_validation(client: TestClient) -> None:
    # Wrong auth + malformed body must return 401, not 422.
    # Auth is the cheaper, security-relevant check; it goes first.
    response = client.post(
        "/v1/run",
        headers={"X-Agent-Auth": "wrong", "content-type": "application/json"},
        content=b"not-json",
    )
    assert response.status_code == 401


# ---------- Unhappy path: validation ----------


def test_run_rejects_invalid_role(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/run",
        headers=auth_headers,
        json={"messages": [{"role": "robot", "content": "x"}]},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_run_rejects_missing_content(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/run",
        headers=auth_headers,
        json={"messages": [{"role": "user"}]},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_run_rejects_missing_role(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/run",
        headers=auth_headers,
        json={"messages": [{"content": "x"}]},
    )
    assert response.status_code == 422


def test_run_rejects_messages_wrong_type(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/run",
        headers=auth_headers,
        json={"messages": "this should be a list"},
    )
    assert response.status_code == 422


def test_run_rejects_malformed_json(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/run",
        headers={**auth_headers, "content-type": "application/json"},
        content=b"not-json",
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


# ---------- Unhappy path: LLM ----------


def test_run_with_key_rejects_empty_messages(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # When OPENROUTER_API_KEY is set, empty messages can't reach the LLM
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    response = client.post("/v1/run", headers=auth_headers, json={"messages": []})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_run_returns_502_on_upstream_api_error(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from openai import APIError

    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    err = APIError("upstream rejected", request=MagicMock(), body={})
    mock_create = AsyncMock(side_effect=err)
    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", mock_create
    ):
        response = client.post(
            "/v1/run",
            headers=auth_headers,
            json={"messages": [{"role": "user", "content": "hi"}]},
        )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "llm_error"


# ---------- Edge ----------


def test_health_works_without_secret_env(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("AGENT_SHARED_SECRET", raising=False)
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
