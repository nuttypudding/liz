#!/bin/bash
# Post-commit reminder: gently nudge to run /update-docs after git commits.
# This hook reads PostToolUse JSON from stdin, checks if the Bash command
# was a git commit, and returns additionalContext if so. Always exits 0
# (non-blocking — this is a suggestion, not a gate).

set -e

# Read the hook input from stdin
INPUT=$(cat)

# Extract the Bash command that was executed
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only trigger on git commit commands (not git add, git push, etc.)
if echo "$COMMAND" | grep -qE '^git commit'; then
  # Return a gentle reminder as additionalContext
  cat <<'HOOK_OUTPUT'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "A git commit was just made. Consider running /update-docs to check if any documentation needs updating based on the committed changes."
  }
}
HOOK_OUTPUT
fi

# Always exit 0 — this is informational, never blocking
exit 0
