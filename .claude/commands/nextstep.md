# /nextstep — Execute Next Task

Continue building Liz by picking and executing the next backlog task.

Override instructions (optional): `$ARGUMENTS`

## Feature Plan Lifecycle

Feature plans move through directories as they progress:

```
features/planned/    → features/inprogress/    → features/completed/
(not started)          (active work)              (done)
```

Each in-progress feature has its own task directories:

```
features/inprogress/<feature>/
├── README.md        ← feature plan
├── backlog/         ← pending tasks
├── doing/           ← current task (max 1)
└── done/            ← completed tasks
```

When starting a feature's first task, move the feature plan from `planned/` to `inprogress/` and create `backlog/`, `doing/`, `done/` subdirectories. When the feature's last task completes, move the entire feature directory to `completed/`, push, and create a PR.

## Feature-Branch Lifecycle

Each feature runs on a dedicated branch. When a feature completes, it gets merged to main via PR before the next feature starts.

```
main ──●──────────────────────────●──────────────────────●───>
        \                        /\                      /
         feature/P2-002 ──●──●──●  feature/P2-003 ──●──●
              (push, PR, merge)       (push, PR, merge)
```

State is tracked in `.claude/feature-lifecycle.json`:
```json
{
  "feature": "P2-002-auto-scheduling-vendors",
  "branch": "feature/P2-002-auto-scheduling-vendors",
  "state": "in_progress",
  "pr_number": null,
  "pr_url": null,
  "updated_at": "2026-04-10T22:15:00Z"
}
```

## Workflow

### 1. Check for Overrides

If `$ARGUMENTS` is not empty, treat it as custom instructions and execute directly (skip task picking).

### 2. Check Lifecycle State

Read `.claude/feature-lifecycle.json`. If it exists and state is `pr_created` or `error`, STOP and report the state. The autorunner handles merging PRs and transitioning between features — `/nextstep` should not proceed when a PR is pending merge or an error needs attention.

### 3. Check for In-Progress Work

Look across all `features/inprogress/*/doing/` directories for any task files. If found, resume that task first.

### 4. Pick Next Task (Feature-Scoped)

Determine the current feature: the **first** `features/inprogress/` directory (alphabetically) that has backlog tasks remaining.

Pick the **lowest-numbered ready task from that feature only**:
- Read files in `features/inprogress/<current-feature>/backlog/`
- Parse YAML frontmatter (`id`, `title`, `tier`, `depends_on`, `feature`)
- Check if dependencies are satisfied (completed task files in `features/inprogress/*/done/` or `features/completed/*/done/`)
- Skip files with `pause_` prefix

**Do NOT pick tasks from other features.** Each feature completes fully before the next one starts.

### 5. Check for Pivots

If `features/inprogress/<feature>/PIVOT.md` exists for the task's feature, STOP and report the pivot reason. Do not proceed.

### 6. Verify Model Tier

Read the task filename prefix:
- `Haiku-` → routine work (migrations, config, tests, docs)
- `Sonnet-` → guided implementation with clear design
- `Opus-` → novel architecture, critical judgment, front-end design

Report the expected tier. If running via autorunner, the correct model is already set.

### 7. Ensure Correct Feature Branch

Check the current git branch and the lifecycle file.

**If on `main`**: This is the start of a new feature. Create the feature branch:
```bash
git checkout -b feature/<feature-name>
```
Write/update `.claude/feature-lifecycle.json` with `state: "in_progress"`, commit it.

**If on the correct feature branch** (matches lifecycle file): Continue.

**If on a wrong branch** (different feature branch, or branch doesn't match lifecycle): STOP with error. Report the mismatch and let the user or autorunner resolve it.

### 8. Move Feature Plan to In-Progress (if needed)

If the task's `feature` field matches a plan in `features/planned/`, MOVE it to `features/inprogress/` and create the `backlog/`, `doing/`, `done/` subdirectories:
```bash
mv features/planned/<feature>/ features/inprogress/
mkdir -p features/inprogress/<feature>/{backlog,doing,done}
```

[CRITICAL: You MUST delete the source folder from `features/planned/` after moving. The feature must exist in only ONE of `planned/`, `inprogress/`, or `completed/` at any time. After the move, verify that `features/planned/<feature>/` no longer exists. If `mv` did not remove it, run `rm -rf features/planned/<feature>/`.]

### 9. Move Task to Doing

```bash
mv features/inprogress/<feature>/backlog/<task-file> features/inprogress/<feature>/doing/
```

### 10. Execute Task

Read the task file thoroughly. Follow all acceptance criteria. Implement the task.

### 11. Test

Run the project test suite. All tests must pass before marking complete.

### 12. Complete Task & Feature Lifecycle

Move the task file to `done/`:
```bash
mv features/inprogress/<feature>/doing/<task-file> features/inprogress/<feature>/done/
```

**Check if this was the last backlog task for the feature:**

**If MORE tasks remain** (normal completion):
```bash
git add <changed files>
git commit -m "T-NNN: <task title>"
git push
```

**If NO more tasks remain** (feature complete):
1. Move the feature to completed:
   ```bash
   mv features/inprogress/<feature>/ features/completed/
   ```
2. Commit all changes:
   ```bash
   git add -A
   git commit -m "Feature complete: <feature-name>"
   ```
3. Push the branch:
   ```bash
   git push -u origin feature/<feature-name>
   ```
4. Create a PR:
   ```bash
   gh pr create --title "Feature: <feature-name>" --base main --body "Automated PR for completed feature <feature-name>"
   ```
5. Update lifecycle file:
   ```json
   {
     "state": "pr_created",
     "pr_number": <number from gh output>,
     "pr_url": "<url from gh output>"
   }
   ```
6. Commit and push the lifecycle update:
   ```bash
   git add .claude/feature-lifecycle.json
   git commit -m "Update lifecycle: PR created for <feature-name>"
   git push
   ```

### 13. Report

- Task completed: ID + title
- Files changed
- Tests: pass/fail
- Feature status: in-progress / completed (PR created)
- Next task available (or backlog empty)
