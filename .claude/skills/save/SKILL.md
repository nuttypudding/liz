---
name: save
description: Save session state to memory before /exit
---

# /save — Save Session State

Save current work-in-progress to persistent memory before exiting.

## What to Save

Update the file `~/.claude/projects/-home-noelcacnio-Documents-repo-liz/memory/wip.md` with:

1. **Current date** (today's date)
2. **Current branch** — run `git branch --show-current`
3. **Uncommitted changes** — run `git status --short` to see what's staged/unstaged/untracked
4. **What's done** — summarize completed work from this session
5. **What's pending** — any remaining tasks, known issues, or next steps
6. **Key files changed** — list the important files that were created, modified, or deleted

## Format

```markdown
# Work In Progress — Session State

**Last updated**: YYYY-MM-DD
**Branch**: `branch-name`
**Status**: Brief one-line status

## What's Done

- Bullet list of completed work

## What's Pending

- [ ] Checkbox list of remaining tasks

## Key Files Changed (uncommitted)

### New files
- file paths

### Modified files
- file paths

### Deleted files
- file paths
```

## After Saving

Print a brief confirmation:

```
Session state saved to memory/wip.md
Branch: <branch>
Uncommitted files: <count>
Ready to /exit
```
