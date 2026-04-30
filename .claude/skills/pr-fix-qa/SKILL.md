---
name: pr-fix-qa
description: Triage and fix PR review comments tagged with `@claude fix this`. Creates a fresh fix branch off the original PR's head, applies each fix as a separate commit, opens a stacked fix PR back into the original PR's branch, and posts `@codex review` on the fix PR. Use when a reviewer (Codex, human, or any bot) leaves an actionable suggestion on a QA-bound PR and wants Claude to handle it.
---

# /pr-fix-qa — Fix PR Comments via a Stacked Fix Branch

This skill walks the open review comments on a PR, picks the ones tagged `@claude fix this`, and **creates a new branch** off the PR's head to land the fixes — never committing directly to the original feature branch. Each fix becomes one commit on the fix branch. A new "fix PR" is opened targeting the original PR's branch, replies link the fix PR back to each original comment thread, and `@codex review` is posted on the fix PR (not the original).

Optional arguments: `$ARGUMENTS` (PR number — defaults to the open PR for the current branch)

## Why a separate fix branch?

- **Isolation.** Original PR's branch isn't disturbed. If a fix is wrong, throw away the fix branch — original work is untouched.
- **Reviewability.** Reviewer / Codex sees fixes as a discrete diff, not buried in the original PR's commit history.
- **Stacking.** When the fix PR merges into the original branch, the original PR auto-updates with the new commits. Codex's re-review on the fix PR doesn't re-litigate the entire original PR.
- **Audit trail.** `git log` cleanly shows "PR #N original work" → "PR #M fix-pass-1 by Claude" → ...

## When to use

- A PR is open against `qa` (or any other base) and a reviewer left a comment containing the literal trigger `@claude fix this`
- The comment describes a concrete, scoped fix Claude can handle automatically
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

Confirm the PR is open and capture its head branch:

```bash
gh pr view "$PR_NUM" --json state,baseRefName,headRefName \
  --jq '"state=\(.state) base=\(.baseRefName) head=\(.headRefName)"'
```

- STOP if `state != OPEN`
- WARN if `base != qa` and ask the user to confirm before continuing (this skill is QA-scoped)

### 2. Fetch tagged comments

Pull both **issue comments** (the chat below the PR description) and **review comments** (line-attached comments inside Files Changed). Filter to those whose body contains `@claude fix this`:

```bash
gh api "repos/{owner}/{repo}/issues/$PR_NUM/comments" \
  --jq '[.[] | select(.body | contains("@claude fix this"))
        | {kind: "issue", id, body, html_url, user: .user.login, created_at}]'

gh api "repos/{owner}/{repo}/pulls/$PR_NUM/comments" \
  --jq '[.[] | select(.body | contains("@claude fix this"))
        | {kind: "review", id, body, html_url, user: .user.login,
            path, line, original_line, side, commit_id}]'
```

If no matches: report and exit. Nothing to do — don't create an empty fix branch.

### 3. Create the fix branch off the original PR's head

```bash
ORIGINAL_BRANCH=$(gh pr view "$PR_NUM" --json headRefName --jq .headRefName)
FIX_BRANCH="fix/pr-${PR_NUM}-claude"

# Sync with origin so the fix branch starts from the latest pushed tip
git fetch origin "$ORIGINAL_BRANCH"

# If a stale fix branch already exists locally or remotely (e.g., from a
# prior /pr-fix-qa run on the same PR), bump the suffix rather than
# clobbering history. Don't force-push.
if git ls-remote --exit-code --heads origin "$FIX_BRANCH" >/dev/null 2>&1; then
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  FIX_BRANCH="fix/pr-${PR_NUM}-claude-${TIMESTAMP}"
fi

git checkout -B "$FIX_BRANCH" "origin/$ORIGINAL_BRANCH"
```

Record the starting SHA so the fix-summary later can list only the new commits:

```bash
BASE_SHA=$(git rev-parse HEAD)
```

## Execution

For each matching comment, follow steps 4–7 sequentially. Don't batch implementations across comments without checking the result of each.

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

### 7. Commit on the fix branch

One commit per comment. Reference the comment URL in the trailer so the audit trail is clean:

```bash
git add <changed files>
git commit -m "$(cat <<'EOF'
<short subject — match the comment's ask>

<body — what was wrong, what changed, why>

Resolves: <comment html_url>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Capture the resulting SHA per comment so step 9's per-thread replies can cite the right commit:

```bash
declare -A FIX_SHAS  # commentId → fix SHA
FIX_SHAS["$COMMENT_ID"]=$(git rev-parse HEAD)
```

### 8. Push the fix branch + open the fix PR

```bash
git push -u origin "$FIX_BRANCH"

# Build the fix PR body — list each commit with its resolved comment URL
SUMMARY=$(git log "${BASE_SHA}..HEAD" --format='- %s%n  Resolves: %(trailers:key=Resolves,valueonly,nokey)' --no-merges)

FIX_PR_URL=$(gh pr create \
  --base "$ORIGINAL_BRANCH" \
  --head "$FIX_BRANCH" \
  --title "Fix review comments on #$PR_NUM" \
  --body "$(cat <<EOF
Stacked fix PR for review comments on #$PR_NUM tagged \`@claude fix this\`.

Each commit below resolves one tagged comment. Merge this PR into \`$ORIGINAL_BRANCH\` to land the fixes on #$PR_NUM.

## Fixes

$SUMMARY

## Test plan

- [x] Local tests pass for affected workspace
- [ ] Codex re-review (triggered automatically below)
- [ ] Original reviewer signs off on #$PR_NUM after merge

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)")
```

The fix PR targets the **original PR's head branch**, not `qa`. When the fix PR merges, the original PR (#$PR_NUM) automatically picks up the fix commits.

### 9. Reply on each original PR's comment thread

For each fixed comment, leave a threaded reply on the **original PR** linking to the fix PR + the specific commit:

```bash
for COMMENT_ID in "${!FIX_SHAS[@]}"; do
  SHA="${FIX_SHAS[$COMMENT_ID]}"
  REPLY_BODY="Addressed in $FIX_PR_URL — commit \`$SHA\`."

  # Review comment (line-attached) — threaded reply preserves context
  gh api -X POST \
    "repos/{owner}/{repo}/pulls/$PR_NUM/comments/$COMMENT_ID/replies" \
    --field body="$REPLY_BODY"

  # For issue comments (general PR conversation), append to the thread:
  # gh pr comment "$PR_NUM" --body "$REPLY_BODY (re: <orig comment URL>)"
done
```

Use the **review comment reply endpoint** for line-attached comments. Use the issue comment endpoint for general PR-conversation comments.

### 10. Trigger Codex re-review on the FIX PR (not the original)

After all per-thread replies are posted, leave one comment on the **fix PR** containing `@codex review`. The Codex GitHub bot watches for this trigger and reviews the focused fix changes — not the entire original PR.

```bash
gh pr comment "$FIX_PR_URL" --body "$(cat <<EOF
@codex review

Fixes for #$PR_NUM comments tagged \`@claude fix this\`:

$SUMMARY
EOF
)"
```

**Rules for this comment:**
- Post **exactly once**, even if multiple comments were fixed in this skill invocation. One `@codex review` is enough.
- Post **on the fix PR**, not the original. The fix PR's diff is the focused review unit.
- Post **at the end**, after all per-thread replies. Codex re-reviews the latest tip.
- If zero comments were actionable (e.g., all were ambiguous and skipped), the fix branch wasn't created (per step 2) — there's nothing to review.

## Report

After the skill finishes, tell the user:
- Original PR number + URL
- Fix branch name + fix PR URL
- How many tagged comments were found and fixed (and how many were skipped, with reasons)
- For each fix: comment URL → commit SHA → fix PR commit URL
- Test status (X/Y tests passing for the affected workspace)
- Confirmation that `@codex review` was posted on the fix PR (URL)
- Suggested next step: `gh pr checks <fix-pr-num>` to watch CI; once Codex + reviewer sign off, merge the fix PR — the original PR will pick up the fixes automatically.

## Safety rails

- **Never push to the original PR's branch directly.** All fixes land on the fix branch, which is reviewed and merged via PR.
- **Never force-push** even on the fix branch. A failed fix should leave history recoverable.
- **Never resolve the conversation thread programmatically** on either PR. Let the reviewer mark resolved after verifying.
- **Never merge** the fix PR or the original PR. This skill creates; it doesn't deploy. Use `/merge-to-qa` separately once review is satisfied.
- **Never commit secrets** even if a comment asks for them. If a comment requests adding a key/secret, STOP and ask the user.
- **Stop on disagreement.** If a comment's suggested fix is wrong (e.g., would introduce a bug), don't apply it. Reply on the thread explaining why and ask the user.

## Related

- `/merge-to-qa` — once all review is addressed and the fix PR + original PR merge, ship to qa
- `/codex:review` — request a fresh review pass on the current branch (not via PR comment)
- `pr-review-toolkit:review-pr` — comprehensive multi-agent PR review from local
