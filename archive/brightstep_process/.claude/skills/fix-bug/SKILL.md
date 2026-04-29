---
name: fix-bug
description: Diagnose a bug, implement the fix, run tests, update docs, and provide a commit summary. Ticket-first workflow with category-aware deployment.
argument-hint: "[--ticket T-NNN | --issue N | description]"
---

# Fix Bug

Diagnose, fix, test, and deploy a bug using the ticket-first workflow.

## Step 0: Parse Arguments

Read `$ARGUMENTS`. Three modes:

**Mode A — Ticket (preferred):** If arguments contain `--ticket T-NNN`, read `.claude/tickets.md` and find that ticket. Extract the description and category, then continue to Step 1.

**Mode B — Legacy issue:** If arguments contain `--issue N`, read `apps/student/apps-student-issue-log.md` and find issue `#N`. Extract the description. Then **auto-create a ticket**: read `.claude/tickets.md`, find the next ticket number, ask the user if this is `bug-fix-dev` or `bug-fix-prod`, and append a new row to Open Tickets. Continue to Step 1 using the new ticket.

**Mode C — Freeform:** If arguments contain a plain text description (no `--ticket` or `--issue`), ask the user if this is `bug-fix-dev` or `bug-fix-prod`. Then auto-create a ticket in `.claude/tickets.md` with the next ticket number. Continue to Step 1 using the new ticket.

If no arguments are provided, ask the user what's broken.

## Step 1: Understand the Bug

Gather context:
- What's the expected behavior?
- What's the actual behavior?
- Any error messages or stack traces?

**Update ticket status to `in-progress`** in `.claude/tickets.md`.

## Step 2: Create a Feature Branch

Create a branch named after the ticket:
```bash
git checkout -b fix/T-NNN-short-description
```

**Update the Branch column** in `.claude/tickets.md` with the branch name.

## Step 3: Diagnose (Parallel Agents)

Spawn **two Explore agents in parallel** using the Task tool to gather context without bloating the main conversation:

**Agent A — Lessons Learned lookup:**
> "Read the Lessons Learned section (L01-L19) at the bottom of `.claude/commands/nextstep.md`. Find any lessons that match this bug: `<bug description>`. Return only the matching lessons with their IDs, problems, and solutions. If none match, say so."

**Agent B — Codebase scan:**
> "Search the codebase for code related to: `<bug description>`. Find the relevant files, functions, and data flow. Check imports, callers, and test files. Return a summary of: (1) the most relevant files with line numbers, (2) the data flow path, (3) any obvious issues you spot."

Wait for both agents to return, then synthesize their findings to identify the root cause. This keeps the main context focused on the fix rather than filled with exploration output.

If the agents don't find enough, do targeted follow-up reads in the main context.

## Step 4: Plan the Fix

Before writing code, briefly state:
- **Root cause**: What's actually wrong
- **Fix approach**: What you'll change and why
- **Blast radius**: What else might be affected

## Step 5: Implement

Apply the fix. Follow the project's coding conventions:
- Python: Use `get_settings()` for config, `get_tracer()` for OTEL spans
- TypeScript: Use shadcn/ui components, strict types, App Router conventions
- Don't over-engineer — fix the bug, don't refactor the neighborhood

## Step 6: Test in Dev

Run the relevant tests:
```bash
# Python
.venv/bin/pytest tests/ -v -k "relevant_test_pattern"

# TypeScript (if applicable)
npm run build --prefix apps/<app>
```

If the bug didn't have a test that catches it, write one.

**Update ticket status to `testing`** in `.claude/tickets.md`.

## Step 7: Deploy (Category-Aware)

**Check the ticket category** to determine the deployment workflow:

### bug-fix-dev (local-only fix)

1. Commit the fix: `git add <files> && git commit -m "Fix T-NNN: <description>"`
2. **Update ticket status to `closed`** — no deployment needed.
3. Skip to Step 10 (Report).

### bug-fix-prod (production fix)

1. Commit the fix: `git add <files> && git commit -m "Fix T-NNN: <description>"`
2. Push the branch: `git push -u origin fix/T-NNN-short-description`
3. Create a PR: `gh pr create --title "Fix T-NNN: <short description>" --body "..."`
4. **Update ticket status to `pr-open`** and add the PR URL to the PR column.
5. Merge the PR: `gh pr merge --squash --delete-branch`
6. Switch to main and pull: `git checkout main && git pull origin main`
7. Run `/deploy-prod` to push to Railway + Vercel.
8. **Update ticket status to `deployed`**.

## Step 8: Test in Production (bug-fix-prod only)

Run `/test-fix-prod` or manually verify the fix on production URLs:
- Frontend: `https://student-theta-teal.vercel.app`
- Backend: `https://brightstep-ikigai-production.up.railway.app`

If prod-specific issues are found, fix them on a new branch, re-deploy, and re-test.

**Update ticket status to `closed`** after successful prod verification.

## Step 9: Update Documentation

Check if the fix changes any behavior documented in `docs/`. If so, update the relevant docs. Apply the same doc-change mapping as `/update-docs`.

## Step 10: Report

Provide a commit-ready summary:
- **Bug**: One-line description
- **Ticket**: T-NNN (`<category>`)
- **Root cause**: What was wrong
- **Fix**: What was changed (file:line references)
- **Tests**: What tests pass / were added
- **Docs**: Any documentation updates
- **Deployed**: Yes/No + commit hash

If this bug revealed a non-obvious pattern, suggest adding it to the Lessons Learned section of `.claude/commands/nextstep.md`.
