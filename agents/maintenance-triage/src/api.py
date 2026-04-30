import json
import os
import secrets
from contextlib import asynccontextmanager
from typing import AsyncIterator, Literal, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from openai import APIError, AsyncOpenAI
from pydantic import BaseModel, Field, ValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

AGENT_NAME = "maintenance-triage"
AGENT_VERSION = "0.0.3"
DEFAULT_MODEL = "anthropic/claude-sonnet-4-6"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Paths exempt from auth. Health checks must work without secrets so
# load balancers / monitors can probe liveness.
UNAUTHENTICATED_PATHS = frozenset({"/v1/health"})

# Closed-set enums for the structured triage output. Kept as module-level
# tuples so the system prompt and Pydantic models read from one source.
CATEGORIES = (
    "plumbing",
    "electrical",
    "hvac",
    "appliance",
    "structural",
    "pest",
    "locksmith",
    "general",
)
URGENCIES = ("emergency", "urgent", "routine", "scheduled")

CategoryT = Literal[
    "plumbing",
    "electrical",
    "hvac",
    "appliance",
    "structural",
    "pest",
    "locksmith",
    "general",
]
UrgencyT = Literal["emergency", "urgent", "routine", "scheduled"]


# Single AsyncOpenAI instance shared across all requests. AsyncOpenAI
# manages an internal connection pool; constructing a new one per request
# would churn that pool, leak file descriptors over time, and add latency.
# The client is created lazily on first use (so tests that don't touch
# OpenRouter never instantiate one) and closed cleanly via the lifespan
# shutdown hook below.
_openrouter_client_instance: Optional[AsyncOpenAI] = None


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    global _openrouter_client_instance
    if _openrouter_client_instance is not None:
        await _openrouter_client_instance.close()
        _openrouter_client_instance = None


app = FastAPI(title=AGENT_NAME, version=AGENT_VERSION, lifespan=lifespan)


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class RunRequest(BaseModel):
    messages: list[Message] = Field(default_factory=list)
    # Optional override of the default model. Any OpenRouter model id works,
    # e.g. "anthropic/claude-sonnet-4-6", "openai/gpt-5", "google/gemini-2.5-pro".
    model: Optional[str] = None


class Gatekeeper(BaseModel):
    """Stage 1 — can the tenant safely resolve the issue themselves?"""

    self_resolvable: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    # Numbered steps to send back to the tenant when self_resolvable is true.
    # Null when the issue requires a vendor or further inspection.
    troubleshooting_guide: Optional[str] = None


class Classification(BaseModel):
    """Stage 2 — vendor/category/urgency routing for the landlord."""

    category: CategoryT
    urgency: UrgencyT
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    recommended_action: str
    cost_estimate_low: int = Field(..., ge=0)
    cost_estimate_high: int = Field(..., ge=0)


class TriageOutput(BaseModel):
    """The full structured response the LLM is required to produce.

    Keep this in lockstep with the system prompt and the web UI's
    expected shape (apps/maintenance-triage-web-test/app/triage-form.tsx).
    """

    gatekeeper: Gatekeeper
    classification: Classification


def _error(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(
        status_code=status, content={"error": {"code": code, "message": message}}
    )


class AuthMiddleware(BaseHTTPMiddleware):
    """Reject unauthenticated requests before any body parsing.

    Order matters: FastAPI's body validation runs in the route layer, so
    without middleware here a malformed body from an unauthenticated
    caller would surface as 422 (leaking schema info). Middleware
    guarantees auth fires first.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in UNAUTHENTICATED_PATHS:
            return await call_next(request)

        secret = os.environ.get("AGENT_SHARED_SECRET")
        if not secret:
            # Fail closed: a misconfigured agent should never accept calls.
            return _error(
                "misconfigured",
                "AGENT_SHARED_SECRET is not set on the server",
                500,
            )

        provided = request.headers.get("x-agent-auth")
        if provided is None or not secrets.compare_digest(provided, secret):
            return _error(
                "unauthorized", "missing or invalid X-Agent-Auth header", 401
            )

        return await call_next(request)


app.add_middleware(AuthMiddleware)


@app.exception_handler(RequestValidationError)
async def _validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return _error("invalid_request", str(exc.errors()), 422)


def _openrouter_client() -> Optional[AsyncOpenAI]:
    """Return the shared AsyncOpenAI client, lazy-initialized once per process.

    The instance is cached at module scope so connection pools and file
    descriptors are reused across requests. Tests reset this via the
    `_reset_openrouter_client_for_tests` hook in conftest.py.
    """
    global _openrouter_client_instance
    if _openrouter_client_instance is not None:
        return _openrouter_client_instance
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None
    _openrouter_client_instance = AsyncOpenAI(
        base_url=OPENROUTER_BASE_URL, api_key=api_key
    )
    return _openrouter_client_instance


def _reset_openrouter_client_for_tests() -> None:
    """Clear the cached client. Called between tests so monkeypatched env
    vars take effect on the next /v1/run call."""
    global _openrouter_client_instance
    _openrouter_client_instance = None


def _resolved_model(override: Optional[str]) -> str:
    return override or os.environ.get("AGENT_TRIAGE_MODEL") or DEFAULT_MODEL


def _system_prompt() -> str:
    """Two-stage triage instructions + JSON output schema.

    The category/urgency closed sets must match the Literal types above —
    if you add a category here, add it to CATEGORIES + CategoryT too, or
    the LLM will emit values Pydantic rejects.
    """
    cats = ", ".join(CATEGORIES)
    urgs = ", ".join(URGENCIES)
    return (
        "You are a property management triage agent. For every tenant "
        "maintenance request you receive:\n"
        "\n"
        "1) GATEKEEPER — Decide if the tenant can safely resolve the issue "
        "themselves with simple steps (e.g., flip a tripped breaker, push "
        "the disposal reset button, replace a smoke alarm battery). Set "
        "self_resolvable accordingly. If true, fill troubleshooting_guide "
        "with numbered steps the tenant can follow. If false, set "
        "troubleshooting_guide to null. Set confidence (0.0-1.0) "
        "reflecting your certainty in this gatekeeper decision.\n"
        "\n"
        "2) CLASSIFICATION — Always classify, even when self_resolvable=true, "
        "so the landlord has a record. Pick exactly one category from: "
        f"{cats}. Pick exactly one urgency from: {urgs}. Provide a clear, "
        "actionable recommended_action (1-3 sentences). Estimate cost "
        "as whole-dollar integers cost_estimate_low and cost_estimate_high "
        "for likely repair total (parts + labor) — set both to 0 only when "
        "self-resolvable. Set confidence_score (0.0-1.0) for the "
        "classification certainty.\n"
        "\n"
        "Respond with ONLY a JSON object matching this exact shape, no "
        "prose, no markdown fences, no explanation:\n"
        "{\n"
        '  "gatekeeper": {\n'
        '    "self_resolvable": <bool>,\n'
        '    "confidence": <float 0.0-1.0>,\n'
        '    "troubleshooting_guide": <string|null>\n'
        "  },\n"
        '  "classification": {\n'
        f'    "category": <one of: {cats}>,\n'
        f'    "urgency": <one of: {urgs}>,\n'
        '    "confidence_score": <float 0.0-1.0>,\n'
        '    "recommended_action": <string>,\n'
        '    "cost_estimate_low": <int >= 0>,\n'
        '    "cost_estimate_high": <int >= 0>\n'
        "  }\n"
        "}"
    )


def _stub_triage_output() -> TriageOutput:
    """Canonical stub used when OPENROUTER_API_KEY is unset.

    Lets the UI render structured fields and tests pass without burning
    tokens or needing network. The recommended_action is a deliberate
    breadcrumb so a human glancing at the UI knows they're in stub mode.
    """
    return TriageOutput(
        gatekeeper=Gatekeeper(
            self_resolvable=False,
            confidence=0.0,
            troubleshooting_guide=None,
        ),
        classification=Classification(
            category="general",
            urgency="routine",
            confidence_score=0.0,
            recommended_action=(
                "Stub mode — set OPENROUTER_API_KEY on the agent to enable "
                "real triage."
            ),
            cost_estimate_low=0,
            cost_estimate_high=0,
        ),
    )


@app.get("/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/info")
def info() -> dict[str, object]:
    return {
        "name": AGENT_NAME,
        "version": AGENT_VERSION,
        "model": _resolved_model(None),
        "openrouter_configured": bool(os.environ.get("OPENROUTER_API_KEY")),
        "capabilities": ["text", "structured-triage"],
    }


@app.post("/v1/run")
async def run(body: RunRequest):
    client = _openrouter_client()
    model = _resolved_model(body.model)

    if client is None:
        # Stub fallback — preserves UI/test flow when no API key is set.
        triage = _stub_triage_output()
        return {
            "agent": AGENT_NAME,
            "version": AGENT_VERSION,
            "model": "stub",
            "usage": None,
            "finish_reason": "stub",
            "gatekeeper": triage.gatekeeper.model_dump(),
            "classification": triage.classification.model_dump(),
        }

    if not body.messages:
        return _error(
            "invalid_request",
            "messages must be non-empty when calling an LLM",
            422,
        )

    # Always prepend our triage system prompt. If the caller also supplies a
    # system message, both reach the model — most providers concatenate
    # consecutive system roles, and our JSON instructions are what enforce
    # the response shape this endpoint is contracted to return.
    llm_messages = [{"role": "system", "content": _system_prompt()}]
    llm_messages.extend(
        {"role": m.role, "content": m.content} for m in body.messages
    )

    try:
        completion = await client.chat.completions.create(
            model=model,
            messages=llm_messages,
            response_format={"type": "json_object"},
        )
    except APIError as e:
        message = getattr(e, "message", None) or str(e)
        return _error("llm_error", f"OpenRouter call failed: {message}", 502)
    except Exception as e:
        return _error("llm_error", f"unexpected error calling OpenRouter: {e}", 502)

    choice = completion.choices[0] if completion.choices else None
    raw_content = (choice.message.content if choice else "") or ""

    # Parse + validate. Both layers can fail independently — JSON-mode
    # reduces but doesn't eliminate the chance of malformed output, and
    # even valid JSON can violate the schema (wrong category, missing
    # field, out-of-range confidence).
    try:
        parsed = json.loads(raw_content)
    except json.JSONDecodeError as e:
        return _error(
            "llm_invalid_response",
            f"LLM did not return valid JSON: {e}; raw={raw_content[:500]}",
            502,
        )

    try:
        triage = TriageOutput.model_validate(parsed)
    except ValidationError as e:
        return _error(
            "llm_invalid_response",
            f"LLM JSON did not match schema: {e.errors()}; raw={raw_content[:500]}",
            502,
        )

    usage = None
    if completion.usage:
        usage = {
            "prompt_tokens": completion.usage.prompt_tokens,
            "completion_tokens": completion.usage.completion_tokens,
            "total_tokens": completion.usage.total_tokens,
        }

    return {
        "agent": AGENT_NAME,
        "version": AGENT_VERSION,
        "model": completion.model or model,
        "usage": usage,
        "finish_reason": choice.finish_reason if choice else None,
        "gatekeeper": triage.gatekeeper.model_dump(),
        "classification": triage.classification.model_dump(),
    }
