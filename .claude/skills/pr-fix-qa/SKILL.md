---
name: pr-fix-qa
description: Triage and fix PR review comments tagged with `@CLAUDE.md fix this`. Reads each tagged comment, applies the fix in the same branch, runs tests, commits, pushes, and replies on the comment thread. Use when a reviewer (Codex, human, or any bot) leaves an actionable suggestion on a QA-bound PR and wants Claude to handle it.
---

# /pr-fix-qa — Fix PR Comments Tagged for Claude

This skill walks the open review comments on a PR, picks the ones tagged `@CLAUDE.md fix this`, implements each fix in the same branch, and replies on the thread.

Optional arguments: `$ARGUMENTS` (PR number — defaults to the open PR for the current branch)

## When to use

- A PR is open against `qa` (or any other base) and a reviewer left a comment containing the literal trigger `@CLAUDE.md fix this`
- The comment describes a concrete, scoped fix the user wants Claude to handle automatically
- The fix is mechanical / small enough to land without a fresh design discussion

## When NOT to use

- The comment is a question, not an actionable fix
- The change requires a design decision the user hasn't made
- The trigger string isn't present in the comment body
- The PR is already closed or merged

## Pre-flight checks

### 1. Determine the target PR

```bash
# Explicit argument wins
PR_NUM="$ARGUMENTS"

# Otherwise infer from the current branch's open PR
if [ -z "$PR_NUM" ]; then
  PR_NUM=$(gh pr view --json number --jq .number 2>/dev/null)
fi

# STOP if no PR found — report and exit
if [ -z "$PR_NUM" ]; then
  echo "No PR found for current branch. Pass a PR number explicitly: /pr-fix-qa 22"
  exit 1
fi
```

Also confirm the PR is open and the base is `qa` (this skill is QA-scoped):

```bash
gh pr view "$PR_NUM" --json state,baseRefName --jq '"state=\(.state) base=\(.baseRefName)"'
```

- STOP if `state != OPEN`
- WARN if `base != qa` and ask the user to confirm before continuing

### 2. Verify branch state

```bash
gh pr view "$PR_NUM" --json headRefName --jq .headRefName
git branch --show-current
```

If the current branch differs from the PR's head ref:
```bash
git checkout "$(gh pr view "$PR_NUM" --json headRefName --jq .headRefName)"
git pull
```

### 3. Fetch tagged comments

Pull both **issue comments** (the chat below the PR description) and **review comments** (line-attached comments inside Files Changed). Filter to those whose body contains `@CLAUDE.md fix this`:

```bash
# Issue / conversation comments
gh api "repos/{owner}/{repo}/issues/$PR_NUM/comments" \
  --jq '[.[] | select(.body | contains("@CLAUDE.md fix this"))
        | {kind: "issue", id, body, html_url, user: .user.login, created_at}]'

# Review comments (line-attached)
gh api "repos/{owner}/{repo}/pulls/$PR_NUM/comments" \
  --jq '[.[] | select(.body | contains("@CLAUDE.md fix this"))
        | {kind: "review", id, body, html_url, user: .user.login,
            path, line, original_line, side, commit_id}]'
```

If no matches: report and exit. Nothing to do.

## Execution

For each matching comment, follow these steps in order. Work through them sequentially — don't batch the implementations across comments without checking.

### 4. Understand the comment

For each match:
- Read the **full body** to extract the requested fix
- For review comments: read the cited file + line(s) to understand the current code
- If the comment is ambiguous or describes a design choice (not a mechanical fix), STOP and ask the user before continuing — don't guess

### 5. Implement the fix

- Make the smallest change that satisfies the comment's intent
- Don't expand scope (no surrounding refactors, no "while I'm here" cleanups)
- If the fix touches the agent (`agents/**`), update tests to cover the new behavior
- If the fix touches Liz (`apps/maintenance-triage-web-test/**` or other workspaces), run any applicable test/lint commands

### 6. Run tests for what changed

```bash
# Agent
git diff --name-only HEAD origin/qa | grep -q "^agents/maintenance-triage/" && \
  npm run test:triage

# Add other workspace test commands as they exist
```

If a test fails, fix it before committing. Don't ship broken tests.

### 7. Commit + push

Build a commit message that references the fix and the comment URL:

```bash
git add <changed files>
git commit -m "$(cat <<'EOF'
<short subject — match the comment's ask>

<body — what was wrong, what changed, why>

Resolves: <comment html_url>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

If multiple comments are being fixed in the same skill invocation, prefer **one commit per comment** so the audit trail is clean. Skip this only if the fixes are tightly coupled.

### 8. Reply on each comment thread

After pushing, reply to each fixed comment with the commit SHA so the reviewer can verify:

```bash
SHA=$(git rev-parse HEAD)

# Issue comment reply (just appends to the conversation)
gh pr comment "$PR_NUM" --body "Fixed in $SHA. See diff for details."

# Review comment reply (threaded on the original line comment)
gh api -X POST "repos/{owner}/{repo}/pulls/$PR_NUM/comments/$COMMENT_ID/replies" \
  --field body="Fixed in $SHA."
```

Use the **review comment reply endpoint** for line-attached comments so the thread shows resolved-in-context. Use the issue comment endpoint for general PR-conversation comments.

## Report

After the skill finishes, tell the user:
- PR number worked on + URL
- How many tagged comments were found
- For each: a one-line summary of the fix + the commit SHA
- Any comments that were skipped (and why — e.g., ambiguous, design decision required)
- Test status (X/Y tests passing for the affected workspace)
- Pointer: `gh pr checks $PR_NUM` to watch CI on the new commit

## Safety rails

- **Never force-push.** A failed fix should leave the PR in a recoverable state, not rewrite history.
- **Never resolve the conversation thread programmatically.** Let the reviewer mark resolved after they verify.
- **Never merge.** This skill fixes; it does not deploy. Use `/merge-to-qa` (separately) once review is satisfied.
- **Never commit secrets** even if a comment asks for them. If a comment requests adding a key/secret, STOP and ask the user.
- **Stop on disagreement.** If the comment's suggested fix is wrong (e.g., would introduce a bug), don't apply it. Reply on the thread explaining why and ask the user.

## Related

- `/merge-to-qa` — once all review is addressed, ship the branch
- `/codex:review` — request a fresh review pass after fixes
- `pr-review-toolkit:review-pr` — comprehensive PR review from local
