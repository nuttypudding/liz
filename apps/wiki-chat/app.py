"""Liz Wiki Chat — conversational interface over the project wiki.

Task 275: wired to Claude API with prompt caching. The full `wiki/**` tree is
loaded into a cached system block so every turn after the first is a cache hit.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import streamlit as st

# Let the wiki_chat package import regardless of cwd.
_app_dir = str(Path(__file__).resolve().parent)
if _app_dir not in sys.path:
    sys.path.insert(0, _app_dir)

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # dotenv is optional; env vars can be preset.
    def load_dotenv(*_args, **_kwargs) -> bool:  # type: ignore[misc]
        return False

from wiki_chat.client import ApiKeyMissing, UsageStats, stream_reply
from wiki_chat.corpus import DEFAULT_MAX_TOKENS, build_corpus

REPO_ROOT = Path(__file__).resolve().parents[2]
WIKI_DIR = REPO_ROOT / "wiki"
load_dotenv(REPO_ROOT / ".env")

SIDEBAR_PAGES: dict[str, Path] = {
    "Where we're at": WIKI_DIR / "status.md",
    "Ready to test": WIKI_DIR / "qa-queue.md",
    "Roadmap": WIKI_DIR / "project" / "roadmap.md",
}

EXAMPLE_QUESTIONS = [
    "What's ready for me to test?",
    "What shipped this week?",
    "What's blocked?",
    "Explain the rent reminder feature",
]

FRIENDLY_API_ERROR = (
    "I can't reach my brain right now — try again in a minute. "
    "If this keeps happening, ask Claude to check `ANTHROPIC_API_KEY`."
)


def _load_page(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return f"Couldn't find `{path.relative_to(REPO_ROOT)}`. Ask Claude to regenerate it."


def _init_session() -> None:
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "sidebar_view" not in st.session_state:
        st.session_state.sidebar_view = None
    if "last_usage" not in st.session_state:
        st.session_state.last_usage = None
    if "corpus" not in st.session_state:
        st.session_state.corpus = build_corpus(WIKI_DIR, max_tokens=DEFAULT_MAX_TOKENS)


def _render_sidebar() -> None:
    with st.sidebar:
        st.markdown("### Liz's Wiki")
        for label in SIDEBAR_PAGES:
            if st.button(label, use_container_width=True, key=f"btn_{label}"):
                st.session_state.sidebar_view = label
        st.divider()
        if st.button("Start fresh chat", use_container_width=True, type="secondary"):
            st.session_state.messages = []
            st.session_state.sidebar_view = None
            st.session_state.last_usage = None
            st.rerun()

        corpus = st.session_state.corpus
        st.divider()
        st.caption(
            f"Wiki corpus: {len(corpus.included_pages)} pages · "
            f"~{corpus.approx_tokens:,} tokens"
        )
        if corpus.cap_hit:
            with st.expander(f"{len(corpus.dropped_pages)} pages dropped"):
                for p in corpus.dropped_pages:
                    st.text(p)


def _render_sidebar_view() -> bool:
    view = st.session_state.sidebar_view
    if not view:
        return False
    path = SIDEBAR_PAGES[view]
    st.subheader(view)
    st.caption(f"From `{path.relative_to(REPO_ROOT)}`")
    st.markdown(_load_page(path))
    if st.button("← Back to chat"):
        st.session_state.sidebar_view = None
        st.rerun()
    return True


def _submit_and_stream(user_text: str) -> None:
    st.session_state.messages.append({"role": "user", "content": user_text})
    with st.chat_message("user"):
        st.markdown(user_text)

    api_messages = [
        {"role": m["role"], "content": m["content"]} for m in st.session_state.messages
    ]

    with st.chat_message("assistant"):
        placeholder = st.empty()
        try:
            result = stream_reply(
                messages=api_messages,
                corpus_text=st.session_state.corpus.text,
            )
            full = ""
            for chunk in result.text_chunks:
                full += chunk
                placeholder.markdown(full + "▌")
            placeholder.markdown(full)
            st.session_state.messages.append({"role": "assistant", "content": full})
            st.session_state.last_usage = result.usage
        except ApiKeyMissing:
            placeholder.warning(
                "No `ANTHROPIC_API_KEY` set — I can't answer questions yet. "
                "Add it to `.env` and restart the app."
            )
        except Exception as exc:  # noqa: BLE001 - show friendly copy, log to server
            placeholder.error(FRIENDLY_API_ERROR)
            print(f"[wiki-chat] API error: {exc}", file=sys.stderr)


def _render_chat() -> None:
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if not st.session_state.messages:
        st.markdown("##### Try a question")
        cols = st.columns(2)
        for i, q in enumerate(EXAMPLE_QUESTIONS):
            if cols[i % 2].button(q, key=f"example_{i}", use_container_width=True):
                _submit_and_stream(q)
                st.rerun()

    user_text = st.chat_input("Ask anything about the Liz project…")
    if user_text:
        _submit_and_stream(user_text)
        st.rerun()


def _render_usage_footer() -> None:
    usage: UsageStats | None = st.session_state.last_usage
    if not usage:
        return
    st.caption(
        f"Last turn · cached: {usage.cache_read_tokens:,} · "
        f"fresh: {usage.input_tokens:,} · "
        f"cache-write: {usage.cache_creation_tokens:,} · "
        f"out: {usage.output_tokens:,}"
    )


def main() -> None:
    st.set_page_config(
        page_title="Liz's Wiki Chat",
        page_icon="💬",
        layout="wide",
    )
    st.markdown(
        """
        <style>
          .block-container { padding-top: 2rem; max-width: 900px; }
          div[data-testid="stChatMessage"] { font-size: 1.05rem; }
        </style>
        """,
        unsafe_allow_html=True,
    )

    _init_session()
    _render_sidebar()

    st.title("Liz's Wiki Chat")
    st.caption("Ask anything about the project. Answers come straight from the wiki.")

    if not _render_sidebar_view():
        _render_chat()
        _render_usage_footer()

    st.divider()
    key_status = "set" if os.getenv("ANTHROPIC_API_KEY") else "missing"
    st.caption(
        f"API key: {key_status} · Out of date? Ask Claude to run `/wiki-lint` or `/wiki-status`."
    )


if __name__ == "__main__":
    main()
