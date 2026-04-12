"""Claude API wrapper for the wiki chat.

Uses prompt caching on the wiki corpus block so every turn after the first is
a cache hit. Streams responses as text chunks.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any

DEFAULT_MODEL = os.getenv("WIKI_CHAT_MODEL", "claude-sonnet-4-6")
DEFAULT_MAX_TOKENS = int(os.getenv("WIKI_CHAT_MAX_TOKENS", "2048"))

SYSTEM_INTRO = (
    "You are the Liz project wiki assistant. Liz is an AI Property Manager platform; "
    "the product owner (also named Liz) is non-technical. "
    "Answer every question grounded in the wiki pages provided below. "
    "Cite pages using their relative paths in backticks (e.g. `wiki/status.md`). "
    "If the wiki does not cover something, say so honestly and suggest the user "
    "ask Claude to run `/ingest <source>` or `/wiki-query <question>`. "
    "Write in plain language — avoid jargon when speaking to Liz. "
    "Never fabricate page paths or claims."
)


@dataclass
class UsageStats:
    input_tokens: int = 0
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0
    output_tokens: int = 0


@dataclass
class StreamResult:
    text_chunks: Iterator[str]
    usage: UsageStats  # populated after the iterator is exhausted


class ApiKeyMissing(RuntimeError):
    pass


def build_system_blocks(corpus_text: str) -> list[dict[str, Any]]:
    """System prompt split so the large corpus block is cacheable."""
    return [
        {"type": "text", "text": SYSTEM_INTRO},
        {
            "type": "text",
            "text": "# Wiki corpus (source of truth)\n\n" + corpus_text,
            "cache_control": {"type": "ephemeral"},
        },
    ]


def stream_reply(
    messages: list[dict[str, Any]],
    corpus_text: str,
    model: str = DEFAULT_MODEL,
    max_tokens: int = DEFAULT_MAX_TOKENS,
) -> StreamResult:
    """Send a chat turn to Claude with a cached wiki corpus. Returns a StreamResult.

    Exhaust `text_chunks` to populate `usage`. Raises ApiKeyMissing if the key is
    absent so callers can render a friendly fallback instead of crashing.
    """
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise ApiKeyMissing("ANTHROPIC_API_KEY not set")

    from anthropic import Anthropic  # lazy import so app.py loads without key/SDK

    client = Anthropic()
    system_blocks = build_system_blocks(corpus_text)

    stats = UsageStats()

    def _iter() -> Iterator[str]:
        with client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            system=system_blocks,
            messages=messages,
        ) as stream:
            for chunk in stream.text_stream:
                yield chunk
            final = stream.get_final_message()
            usage = final.usage
            stats.input_tokens = getattr(usage, "input_tokens", 0) or 0
            stats.output_tokens = getattr(usage, "output_tokens", 0) or 0
            stats.cache_read_tokens = getattr(usage, "cache_read_input_tokens", 0) or 0
            stats.cache_creation_tokens = (
                getattr(usage, "cache_creation_input_tokens", 0) or 0
            )

    return StreamResult(text_chunks=_iter(), usage=stats)
