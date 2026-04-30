"""Unit tests for the maintenance-triage agent.

Coverage map (mirrors the validation checklist in
features/planned/P4-001-agent-platform/POC.md):

Happy path:
- /v1/health is unauthenticated
- /v1/info reports name/version/model/openrouter_configured/capabilities
- /v1/run returns structured stub when OPENROUTER_API_KEY is unset
- /v1/run accepts empty messages array (stub path), default messages,
  every valid role, and ignores extra fields
- /v1/run with OPENROUTER_API_KEY set: model from request body overrides
  AGENT_TRIAGE_MODEL env, which overrides DEFAULT_MODEL
- /v1/run with OPENROUTER_API_KEY set returns parsed gatekeeper +
  classification when LLM emits valid JSON
- /v1/run prepends the triage system prompt before forwarding messages
- /v1/run requests JSON object response format from OpenRouter

Unhappy path (auth):
- /v1/info and /v1/run reject missing, empty, or wrong X-Agent-Auth (401)
- Auth precedes body validation

Unhappy path (validation):
- 422 on invalid role enum, missing role/content, wrong type, malformed JSON

Unhappy path (LLM):
- /v1/run with OPENROUTER_API_KEY set + empty messages → 422
- /v1/run with OPENROUTER_API_KEY set + LLM raises APIError → 502 llm_error
- /v1/run with non-JSON LLM content → 502 llm_invalid_response
- /v1/run with JSON that violates the triage schema → 502 llm_invalid_response

Edge:
- /v1/health works even without AGENT_SHARED_SECRET in env
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# Canonical valid LLM response — used as the default mock body throughout.
# Tests that need to probe specific schema-violation cases construct their
# own variant and pass it explicitly.
VALID_TRIAGE_JSON = json.dumps(
    {
        "gatekeeper": {
            "self_resolvable": False,
            "confidence": 0.92,
            "troubleshooting_guide": None,
        },
        "classification": {
            "category": "plumbing",
            "urgency": "emergency",
            "confidence_score": 0.95,
            "recommended_action": (
                "Dispatch a licensed plumber within 24 hours to inspect the "
                "water heater. Pooling water plus rumbling suggests tank "
                "failure — shut off the cold-water supply as a precaution."
            ),
            "cost_estimate_low": 600,
            "cost_estimate_high": 1800,
        },
    }
)


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
    assert body["version"] == "0.0.3"
    assert body["model"] == "anthropic/claude-sonnet-4-6"
    assert body["openrouter_configured"] is False
    assert body["capabilities"] == ["text", "structured-triage"]


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


def test_run_returns_structured_stub_when_no_openrouter_key(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/run",
        headers=auth_headers,
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["agent"] == "maintenance-triage"
    assert body["version"] == "0.0.3"
    assert body["model"] == "stub"
    assert body["finish_reason"] == "stub"
    # Structured fields must be present in stub mode so the UI renders.
    assert body["gatekeeper"]["self_resolvable"] is False
    assert body["gatekeeper"]["confidence"] == 0.0
    assert body["gatekeeper"]["troubleshooting_guide"] is None
    assert body["classification"]["category"] == "general"
    assert body["classification"]["urgency"] == "routine"
    assert "OPENROUTER_API_KEY" in body["classification"]["recommended_action"]


def test_run_stub_accepts_empty_messages(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post("/v1/run", headers=auth_headers, json={"messages": []})
    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "stub"
    assert "gatekeeper" in body
    assert "classification" in body


def test_run_stub_accepts_missing_messages(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post("/v1/run", headers=auth_headers, json={})
    assert response.status_code == 200
    assert response.json()["model"] == "stub"


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


def test_run_returns_parsed_triage_when_key_set(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    mock_create = AsyncMock(
        return_value=_mock_completion(VALID_TRIAGE_JSON, "anthropic/claude-sonnet-4-6")
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
    assert body["model"] == "anthropic/claude-sonnet-4-6"
    assert body["usage"]["total_tokens"] == 30
    assert body["finish_reason"] == "stop"
    assert body["gatekeeper"]["self_resolvable"] is False
    assert body["gatekeeper"]["confidence"] == 0.92
    assert body["classification"]["category"] == "plumbing"
    assert body["classification"]["urgency"] == "emergency"
    assert body["classification"]["cost_estimate_low"] == 600
    assert body["classification"]["cost_estimate_high"] == 1800


def test_run_prepends_triage_system_prompt(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    mock_create = AsyncMock(
        return_value=_mock_completion(VALID_TRIAGE_JSON, "anthropic/claude-sonnet-4-6")
    )
    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", mock_create
    ):
        client.post(
            "/v1/run",
            headers=auth_headers,
            json={"messages": [{"role": "user", "content": "leak"}]},
        )
    sent_messages = mock_create.call_args.kwargs["messages"]
    # First message is our injected triage system prompt.
    assert sent_messages[0]["role"] == "system"
    assert "GATEKEEPER" in sent_messages[0]["content"]
    assert "CLASSIFICATION" in sent_messages[0]["content"]
    # Caller's message is preserved at index 1.
    assert sent_messages[1] == {"role": "user", "content": "leak"}


def test_run_requests_json_object_response_format(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    mock_create = AsyncMock(
        return_value=_mock_completion(VALID_TRIAGE_JSON, "x/y")
    )
    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", mock_create
    ):
        client.post(
            "/v1/run",
            headers=auth_headers,
            json={"messages": [{"role": "user", "content": "x"}]},
        )
    # Without response_format the LLM may emit prose, breaking the
    # downstream parse step. This is the contract that makes the parse
    # step's failure rate low enough to be a 502 rather than the norm.
    assert mock_create.call_args.kwargs["response_format"] == {
        "type": "json_object"
    }


def test_run_request_model_overrides_env_default(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    monkeypatch.setenv("AGENT_TRIAGE_MODEL", "anthropic/claude-sonnet-4-6")
    mock_create = AsyncMock(
        return_value=_mock_completion(VALID_TRIAGE_JSON, "openai/gpt-5")
    )
    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", mock_create
    ):
        response = client.post(
            "/v1/run",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "hi"}],
                "model": "openai/gpt-5",
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
        return_value=_mock_completion(VALID_TRIAGE_JSON, "google/gemini-2.5-pro")
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


def test_openrouter_client_is_reused_across_requests(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Regression: a single AsyncOpenAI instance must be shared across
    /v1/run calls so the underlying HTTP connection pool is reused.
    Per-request construction would churn pools and leak file descriptors
    under load.
    """
    from src import api as api_module

    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    mock_create = AsyncMock(return_value=_mock_completion(VALID_TRIAGE_JSON, "x/y"))
    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", mock_create
    ):
        for _ in range(3):
            response = client.post(
                "/v1/run",
                headers=auth_headers,
                json={"messages": [{"role": "user", "content": "ping"}]},
            )
            assert response.status_code == 200

    assert api_module._openrouter_client_instance is not None
    first_id = id(api_module._openrouter_client_instance)
    assert id(api_module._openrouter_client()) == first_id
    assert id(api_module._openrouter_client()) == first_id


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


def test_run_returns_502_when_llm_emits_non_json(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """JSON mode is a request, not a guarantee — Anthropic via OpenRouter
    occasionally wraps JSON in markdown fences or includes commentary.
    The agent must surface this as a structured 502 rather than crashing."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    mock_create = AsyncMock(
        return_value=_mock_completion(
            "Sure, here you go: this is not valid JSON.", "x/y"
        )
    )
    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", mock_create
    ):
        response = client.post(
            "/v1/run",
            headers=auth_headers,
            json={"messages": [{"role": "user", "content": "hi"}]},
        )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "llm_invalid_response"


def test_run_returns_502_on_schema_violation(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Even valid JSON can violate the schema (wrong category enum,
    out-of-range confidence, missing required field). Pydantic catches
    these and we return 502 with details for debugging."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test")
    bad = json.dumps(
        {
            "gatekeeper": {
                "self_resolvable": True,
                "confidence": 0.5,
                "troubleshooting_guide": "Step 1...",
            },
            "classification": {
                "category": "alien-invasion",  # not in the enum
                "urgency": "emergency",
                "confidence_score": 0.9,
                "recommended_action": "Call Mulder.",
                "cost_estimate_low": 100,
                "cost_estimate_high": 200,
            },
        }
    )
    mock_create = AsyncMock(return_value=_mock_completion(bad, "x/y"))
    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", mock_create
    ):
        response = client.post(
            "/v1/run",
            headers=auth_headers,
            json={"messages": [{"role": "user", "content": "hi"}]},
        )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "llm_invalid_response"


# ---------- Edge ----------


def test_health_works_without_secret_env(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("AGENT_SHARED_SECRET", raising=False)
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
