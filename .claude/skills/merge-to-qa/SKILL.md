---
name: merge-to-qa
description: Commit current changes, push the current feature branch, open a PR into qa, and merge it. Triggers the QA deploy workflow on Spark. Use this to ship work to triage-qa.brightstep.ai and liz-qa.brightstep.ai.
---

# /merge-to-qa — Commit, Push, PR, and Merge to QA

Commit any pending changes, push the current feature branch, create a pull request targeting **qa**, and merge it.

Pushing to qa triggers `.github/workflows/deploy-qa.yml`, which builds the legacy Liz QA app on Spark and restarts the `liz-qa` systemd service. If the agent platform's systemd units are also configured on Spark, restarting them is a separate step (the workflow doesn't manage them yet).

Optional arguments: `$ARGUMENTS` (PR title override)

## Pre-flight checks

### 1. Verify branch state

```bash
git branch --show-current
git status --short --untracked-files=all
```

- STOP if on `qa` directly — nothing to merge from a feature branch.
- STOP if on `main` — `main` should not flow into `qa` via this skill (qa is downstream of main; if you need to bring main → qa, do it explicitly via a separate sync PR).

### 2. Run tests for what you changed

Before committing, run the relevant test suite:

```bash
# Build the union of (a) committed diff vs origin/qa and (b) working-tree
# changes — staged, unstaged, and untracked. Tests run BEFORE the commit
# in step 3, so a check that only inspects HEAD would miss the very edits
# we're about to ship.
CHANGED=$(
  {
    git diff --name-only origin/qa..HEAD            # committed
    git diff --name-only HEAD                       # unstaged
    git diff --name-only --cached                   # staged
    git ls-files --others --exclude-standard        # untracked
  } | sort -u
)

# Agent changes
echo "$CHANGED" | grep -q "^agents/maintenance-triage/" && npm run test:triage

# Web changes — currently no per-app vitest for maintenance-triage-web-test;
# rely on local Playwright + manual smoke. When tests exist, run them here.

# Legacy archived app changes (rare on the agent platform branch) — its tests
# live under archive/apps/web/ and are run with: npm run test --workspace=archive/apps/web
```

If any test fails, STOP — fix before merging to qa.

### 3. Commit pending changes

If `git status` shows staged or unstaged changes (or relevant untracked files):

1. Inspect the diff:
   ```bash
   git diff --stat HEAD
   git status --short --untracked-files=all
   ```
2. Stage tracked + relevant untracked files. **Never** stage:
   - `.env`, `.env.local`, `.env.*.local`, `.env.qa`, `.env.prod` (secrets)
   - `node_modules/`, `.next/`, `.venv/`, `__pycache__/`, build artifacts
   - `.playwright-mcp/` (browser session artifacts)
3. Build a commit message that captures **what changed and why**, not the file list. Use the project's existing commit-message style:
   - First line: short summary (`<scope>: <change>` or `P{phase}-{seq} POC-N: <what>`)
   - Body: bullet points grouped by area (agent, web, tests, docs)
   - Trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
4. Commit:
   ```bash
   git commit -m "$(cat <<'EOF'
   <subject>

   <body>

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
   EOF
   )"
   ```

If there are no changes to commit, skip this step.

### 4. Verify commits ahead of qa

```bash
git log origin/qa..HEAD --oneline
```

- STOP if no commits ahead of qa — nothing to ship.

## Execution

### 5. Push the branch

```bash
git push -u origin $(git branch --show-current)
```

If push fails (rejected non-fast-forward, auth issue), report the exact error and STOP.

### 6. Create the pull request

PR title:
- If `$ARGUMENTS` is non-empty, use it verbatim.
- Otherwise derive from the most recent commit subject (or the branch name as a fallback).

PR body — auto-generate from the commit list and any relevant context:

```bash
gh pr create \
  --base qa \
  --head "$(git branch --show-current)" \
  --title "<title>" \
  --body "$(cat <<'EOF'
## Summary

<one-paragraph description from commit subjects + your understanding of the change>

## What deploys to QA after merge

- Spark auto-build kicks off via .github/workflows/deploy-qa.yml on push to qa.
- The workflow currently builds and restarts only `archive/apps/web` (legacy Liz QA → liz-qa.brightstep.ai).
- For the agent platform (triage-qa.brightstep.ai): if you've set up systemd units on Spark per agents/maintenance-triage/docs/spark-deploy.md, run `systemctl --user restart triage-agent triage-web` on Spark after merge to pick up new code.

## Action required after merge (if relevant)

- New env vars? List them here so the human knows to set them on Spark before restarting services.
- Schema migrations? Note the migration file(s) and any data backfill steps.
- Cloudflared changes? Note any new tunnel ingress rules.

## Test plan

- [x] Local: <what was verified locally>
- [ ] **You**: <what needs Spark-side verification>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Report the PR URL.

### 7. Merge the PR

```bash
gh pr merge --squash --delete-branch
```

(Squash to keep qa history clean; the feature branch's commits stay in main if/when this work also flows there.)

If merge fails (failing checks, conflicts):
- Report the error and the PR URL.
- STOP — do not force-merge or use `--admin`.

### 8. Sync local

```bash
git checkout qa
git pull origin qa
```

### 9. Report

After successful merge, tell the user:
- Branch pushed and merged
- PR URL
- The QA deploy workflow's status URL: `gh run list --workflow=deploy-qa.yml --limit 1`
- Reminder: if agent-platform code changed, SSH to Spark and run `systemctl --user restart triage-agent triage-web` to pick up the new build (until the workflow learns to do this automatically).

## When NOT to use this skill

- **Pushing to main**: use `/merge-to-main` instead. qa is downstream of main; production-bound code should go through main first.
- **Hotfix to QA only** (won't go to main): create a `hotfix/` branch off `qa`, run this skill from there, but be aware the change won't propagate to main without a separate PR.
- **Secrets / env vars**: those don't go through git. Set them on Spark or in Vercel directly.

## Related

- `/merge-to-main` — same flow but targets main
- `/ship` — commits + tests, but doesn't push or PR
- `agents/maintenance-triage/docs/spark-deploy.md` — full Spark deploy runbook for the agent platform
