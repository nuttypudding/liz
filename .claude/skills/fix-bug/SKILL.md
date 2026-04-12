---
name: fix-bug
description: Diagnose a bug, implement the fix, run tests, update docs, and provide a commit summary. Ticket-first workflow with category-aware deployment.
---

# /fix-bug — Ticket-First Bug Fix

Arguments: `$ARGUMENTS`

## Input Modes

1. **`--ticket T-NNN`** (preferred) — Read ticket from `.claude/tickets.md`
2. **Freeform description** — Auto-create ticket first, then proceed

## Workflow

### 1. Parse Input

- If `--ticket T-NNN`: Read `.claude/tickets.md`, find the ticket, extract description and category
- If freeform: Ask category (bug-fix-dev or bug-fix-prod), create ticket via `/log-bug` logic, then proceed

### 2. Create Branch

```bash
git checkout -b fix/T-NNN-short-description
```

### 3. Diagnose

Launch **two parallel Explore agents**:
- **Agent A**: Search codebase for the bug — grep for relevant functions, error messages, related code
- **Agent B**: Check `wiki/decisions/` and `wiki/project/` for context on the affected feature

Synthesize findings from both agents.

### 4. Plan Fix

Describe the fix approach before implementing. If the fix is non-trivial, confirm with the user.

### 5. Implement

Write the fix. Follow existing code conventions.

### 6. Test

Run the test suite. If tests fail, fix them. If no tests exist for the affected code, write them.

### 7. Update Ticket

Update the ticket status in `.claude/tickets.md`:
- Set status to `testing`
- Add branch name

### 8. Category-Aware Next Steps

- **bug-fix-dev**: Commit changes. Update ticket to `closed`. Done.
- **bug-fix-prod**: Commit changes. Update ticket to `pr-open`. Inform user to run `/deploy-prod` when ready.

### 9. Wiki Hooks

Append to `wiki/log.md`:
```
## [YYYY-MM-DD] bug-fixed | T-NNN — <title>
- Root cause: <one sentence>
- Files: <short list>
- Concept-page update proposed: [[concepts/...]] or none
```

If the root cause reflects a non-obvious system behavior (e.g. "Clerk webhook doesn't set publicMetadata.role for self-signup users"), **ask the user** if you should append a "Known gotcha" section to the relevant concept page (e.g. `wiki/concepts/clerk-roles.md`). Do not edit the concept page without approval.

Invoke `/wiki-qa-refresh` after any ticket status change.

### 10. Report

- What was the bug
- What caused it
- What was fixed
- Tests added/updated
- Ticket status
