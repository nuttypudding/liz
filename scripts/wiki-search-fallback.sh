#!/bin/bash
# wiki-search-fallback.sh — Temporary grep-based wiki search
# Usage: ./scripts/wiki-search-fallback.sh "query"
#
# This is a fallback for when qmd is not installed. Requires Node.js
# to be available for the real qmd installation.

if [ $# -eq 0 ]; then
  echo "Usage: $0 \"search query\""
  echo ""
  echo "Example: $0 \"Clerk roles\""
  exit 1
fi

QUERY="$1"
WIKI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/wiki"

echo "Searching wiki for: $QUERY"
echo "---"

grep -r --include="*.md" -in "$QUERY" "$WIKI_DIR" | grep -v "^$WIKI_DIR/raw/" | sort | uniq

echo ""
echo "Tip: Use 'qmd search \"$QUERY\"' once Node.js is installed for better results."
