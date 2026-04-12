"""Walk wiki/** and assemble a single markdown corpus for the cached system prompt.

Skips binary assets (`wiki/raw/assets/**`) and enforces a size cap so the corpus
stays under Claude's context budget. Dropped pages are reported so operators can
decide whether to shrink the wiki or raise the cap.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

# ~4 chars per token is a rough-but-safe estimate for English markdown.
CHARS_PER_TOKEN = 4
DEFAULT_MAX_TOKENS = 800_000

SKIP_DIRS = ("wiki/raw/assets",)
INCLUDED_SUFFIXES = (".md", ".mdx")


@dataclass
class CorpusResult:
    text: str
    included_pages: list[str]
    dropped_pages: list[str]
    approx_tokens: int

    @property
    def cap_hit(self) -> bool:
        return bool(self.dropped_pages)


def _iter_wiki_files(wiki_dir: Path) -> list[Path]:
    files: list[Path] = []
    for path in sorted(wiki_dir.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in INCLUDED_SUFFIXES:
            continue
        rel = path.relative_to(wiki_dir.parent).as_posix()
        if any(rel.startswith(skip) for skip in SKIP_DIRS):
            continue
        files.append(path)
    return files


def build_corpus(
    wiki_dir: Path,
    max_tokens: int = DEFAULT_MAX_TOKENS,
) -> CorpusResult:
    """Concatenate wiki markdown into one string, capped by approximate token count."""
    max_chars = max_tokens * CHARS_PER_TOKEN
    parts: list[str] = []
    included: list[str] = []
    dropped: list[str] = []
    total_chars = 0

    for path in _iter_wiki_files(wiki_dir):
        rel = path.relative_to(wiki_dir.parent).as_posix()
        try:
            body = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            dropped.append(rel)
            continue

        block = f"\n\n<!-- page: {rel} -->\n{body.strip()}\n"
        if total_chars + len(block) > max_chars:
            dropped.append(rel)
            continue

        parts.append(block)
        included.append(rel)
        total_chars += len(block)

    return CorpusResult(
        text="".join(parts),
        included_pages=included,
        dropped_pages=dropped,
        approx_tokens=total_chars // CHARS_PER_TOKEN,
    )
