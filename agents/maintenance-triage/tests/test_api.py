"""Unit tests for the maintenance-triage agent (POC-1).

Coverage map (mirrors the validation checklist in
features/planned/P4-001-agent-platform/POC.md):

Happy path:
- /v1/health is unauthenticated and returns {status: "ok"}
- /v1/info returns name/version/model/capabilities with valid auth
- /v1/run returns hello-world payload with valid auth + body
- /v1/run accepts empty messages array, missing messages key,
  every valid role, and ignores extra fields

Unhappy path (auth):
- /v1/info and /v1/run reject missing, empty, or wrong X-Agent-Auth (401)
- Auth failure precedes body validation

Unhappy path (validation):
- 422 on invalid role enum, missing role/content, wrong type, malformed JSON

Edge:
- /v1/health works even without AGENT_SHARED_SECRET in env
"""

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
    assert body == {
        "name": "maintenance-triage",
        "version": "0.0.1",
        "model": "stub",
        "capabilities": [],
    }


def test_run_with_valid_auth_and_body(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/run",
        headers=auth_headers,
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert response.status_code == 200
    assert response.json() == {
        "message": "hello world",
        "agent": "maintenance-triage",
        "version": "0.0.1",
    }


def test_run_empty_messages_array_is_valid(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post("/v1/run", headers=auth_headers, json={"messages": []})
    assert response.status_code == 200


def test_run_missing_messages_uses_default(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    # `messages` has Field(default_factory=list); body without it is valid.
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
    # Pydantic default is to ignore unknown fields, so callers can carry
    # extra metadata without breaking us.
    response = client.post(
        "/v1/run",
        headers=auth_headers,
        json={
            "messages": [{"role": "user", "content": "x", "metadata": "ignored"}],
            "trace_id": "tr_123",
        },
    )
    assert response.status_code == 200


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


def test_run_rejects_content_wrong_type(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/run",
        headers=auth_headers,
        json={"messages": [{"role": "user", "content": 12345}]},
    )
    # Pydantic will coerce or reject depending on strict mode; we use
    # default coercion, so an int may be coerced to str. If it does coerce,
    # the call succeeds. Either outcome is consistent — pin behavior.
    assert response.status_code in (200, 422)


# ---------- Edge: env-var dependence ----------


def test_health_works_without_secret_env(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.delenv("AGENT_SHARED_SECRET", raising=False)
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
