import os
import secrets
from typing import Literal, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from openai import APIError, AsyncOpenAI
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

AGENT_NAME = "maintenance-triage"
AGENT_VERSION = "0.0.2"
DEFAULT_MODEL = "anthropic/claude-sonnet-4-6"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Paths exempt from auth. Health checks must work without secrets so
# load balancers / monitors can probe liveness.
UNAUTHENTICATED_PATHS = frozenset({"/v1/health"})

app = FastAPI(title=AGENT_NAME, version=AGENT_VERSION)


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class RunRequest(BaseModel):
    messages: list[Message] = Field(default_factory=list)
    # Optional override of the default model. Any OpenRouter model id works,
    # e.g. "anthropic/claude-sonnet-4-6", "openai/gpt-5", "google/gemini-2.5-pro".
    model: Optional[str] = None


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
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None
    return AsyncOpenAI(base_url=OPENROUTER_BASE_URL, api_key=api_key)


def _resolved_model(override: Optional[str]) -> str:
    return override or os.environ.get("AGENT_TRIAGE_MODEL") or DEFAULT_MODEL


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
        "capabilities": ["text"],
    }


@app.post("/v1/run")
async def run(body: RunRequest):
    client = _openrouter_client()
    model = _resolved_model(body.model)

    if client is None:
        # Stub fallback — POC-1 behavior preserved when no API key is set.
        # Useful for UI iteration and tests without burning tokens.
        return {
            "message": "hello world (stub: OPENROUTER_API_KEY not set)",
            "agent": AGENT_NAME,
            "version": AGENT_VERSION,
            "model": "stub",
        }

    if not body.messages:
        return _error(
            "invalid_request",
            "messages must be non-empty when calling an LLM",
            422,
        )

    try:
        completion = await client.chat.completions.create(
            model=model,
            messages=[{"role": m.role, "content": m.content} for m in body.messages],
        )
    except APIError as e:
        # OpenRouter / upstream provider error.
        message = getattr(e, "message", None) or str(e)
        return _error("llm_error", f"OpenRouter call failed: {message}", 502)
    except Exception as e:
        return _error("llm_error", f"unexpected error calling OpenRouter: {e}", 502)

    choice = completion.choices[0] if completion.choices else None
    content = (choice.message.content if choice else "") or ""

    usage = None
    if completion.usage:
        usage = {
            "prompt_tokens": completion.usage.prompt_tokens,
            "completion_tokens": completion.usage.completion_tokens,
            "total_tokens": completion.usage.total_tokens,
        }

    return {
        "message": content,
        "agent": AGENT_NAME,
        "version": AGENT_VERSION,
        "model": completion.model or model,
        "usage": usage,
        "finish_reason": choice.finish_reason if choice else None,
    }
