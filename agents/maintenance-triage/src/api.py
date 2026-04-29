import os
import secrets
from typing import Literal

from fastapi import FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

AGENT_NAME = "maintenance-triage"
AGENT_VERSION = "0.0.1"
AGENT_MODEL = "stub"

app = FastAPI(title=AGENT_NAME, version=AGENT_VERSION)


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class RunRequest(BaseModel):
    messages: list[Message] = Field(default_factory=list)


def _shared_secret() -> str:
    secret = os.environ.get("AGENT_SHARED_SECRET")
    if not secret:
        raise RuntimeError(
            "AGENT_SHARED_SECRET not set. Copy .env.local.example to .env.local and load it before starting uvicorn."
        )
    return secret


def _error(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def _check_auth(x_agent_auth: str | None) -> JSONResponse | None:
    if x_agent_auth is None or not secrets.compare_digest(x_agent_auth, _shared_secret()):
        return _error("unauthorized", "missing or invalid X-Agent-Auth header", 401)
    return None


@app.exception_handler(RequestValidationError)
async def _validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return _error("invalid_request", str(exc.errors()), 422)


@app.get("/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/info")
def info(x_agent_auth: str | None = Header(default=None, alias="X-Agent-Auth")):
    if denied := _check_auth(x_agent_auth):
        return denied
    return {
        "name": AGENT_NAME,
        "version": AGENT_VERSION,
        "model": AGENT_MODEL,
        "capabilities": [],
    }


@app.post("/v1/run")
def run(
    body: RunRequest,
    x_agent_auth: str | None = Header(default=None, alias="X-Agent-Auth"),
):
    if denied := _check_auth(x_agent_auth):
        return denied
    return {
        "message": "hello world",
        "agent": AGENT_NAME,
        "version": AGENT_VERSION,
    }
