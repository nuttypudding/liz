"""Liz Wiki Chat — conversational interface over the project wiki.

Task 274 scaffold: UI only, no API integration yet.
Task 275 wires this to the Claude API with a cached wiki corpus.
"""

from __future__ import annotations

from pathlib import Path

import streamlit as st

# Resolve repo root so sidebar buttons can read wiki/** regardless of cwd.
REPO_ROOT = Path(__file__).resolve().parents[2]
WIKI_DIR = REPO_ROOT / "wiki"

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


def _load_page(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return f"Couldn't find `{path.relative_to(REPO_ROOT)}`. Ask Claude to regenerate it."


def _placeholder_reply(user_text: str) -> str:
    """Task 274 placeholder. Task 275 replaces this with a real Claude call."""
    return (
        "I'm still warming up — the wiki chat isn't wired to Claude yet. "
        f"You asked: _{user_text}_\n\n"
        "Once task 275 lands, I'll answer grounded in the wiki with page citations."
    )


def _init_session() -> None:
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "sidebar_view" not in st.session_state:
        st.session_state.sidebar_view = None


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
            st.rerun()


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


def _render_chat() -> None:
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if not st.session_state.messages:
        st.markdown("##### Try a question")
        cols = st.columns(2)
        for i, q in enumerate(EXAMPLE_QUESTIONS):
            if cols[i % 2].button(q, key=f"example_{i}", use_container_width=True):
                _submit(q)
                st.rerun()

    user_text = st.chat_input("Ask anything about the Liz project…")
    if user_text:
        _submit(user_text)
        st.rerun()


def _submit(text: str) -> None:
    st.session_state.messages.append({"role": "user", "content": text})
    reply = _placeholder_reply(text)
    st.session_state.messages.append({"role": "assistant", "content": reply})


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

    st.divider()
    st.caption(
        "Out of date? Ask Claude to run `/wiki-lint` to tidy things up, "
        "or `/wiki-status` to refresh what's shipped."
    )


if __name__ == "__main__":
    main()
