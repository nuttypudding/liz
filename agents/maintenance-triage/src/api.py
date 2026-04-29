import os
import secrets
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

AGENT_NAME = "maintenance-triage"
AGENT_VERSION = "0.0.1"
AGENT_MODEL = "stub"

# Paths exempt from auth. Health checks must work without secrets so
# load balancers / monitors can probe liveness.
UNAUTHENTICATED_PATHS = frozenset({"/v1/health"})

app = FastAPI(title=AGENT_NAME, version=AGENT_VERSION)


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class RunRequest(BaseModel):
    messages: list[Message] = Field(default_factory=list)


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


@app.get("/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/info")
def info() -> dict[str, object]:
    return {
        "name": AGENT_NAME,
        "version": AGENT_VERSION,
        "model": AGENT_MODEL,
        "capabilities": [],
    }


@app.post("/v1/run")
def run(body: RunRequest) -> dict[str, str]:
    return {
        "message": "hello world",
        "agent": AGENT_NAME,
        "version": AGENT_VERSION,
    }
