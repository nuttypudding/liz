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

When starting a feature's first task, move the feature plan from `planned/` to `inprogress/` and create `backlog/`, `doing/`, `done/` subdirectories. When the feature's last task completes, move the entire feature directory to `completed/`.

## Workflow

### 1. Check for Overrides

If `$ARGUMENTS` is not empty, treat it as custom instructions and execute directly (skip task picking).

### 2. Check for In-Progress Work

Look across all `features/inprogress/*/doing/` directories for any task files. If found, resume that task first.

### 3. Pick Next Task

Read all files across `features/inprogress/*/backlog/`. For each task:
- Parse YAML frontmatter (`id`, `title`, `tier`, `depends_on`, `feature`)
- Check if dependencies are satisfied (completed task files in `features/inprogress/*/done/` or `features/completed/*/done/`)
- Skip files with `pause_` prefix

Pick the **lowest-numbered ready task** (dependencies satisfied, not paused).

### 4. Check for Pivots

If `features/inprogress/<feature>/PIVOT.md` exists for the task's feature, STOP and report the pivot reason. Do not proceed.

### 5. Verify Model Tier

Read the task filename prefix:
- `Haiku-` → routine work (migrations, config, tests, docs)
- `Sonnet-` → guided implementation with clear design
- `Opus-` → novel architecture, critical judgment, front-end design

Report the expected tier. If running via autorunner, the correct model is already set.

### 6. Ensure Correct Feature Branch

Check the current git branch. The task must run on a feature branch for its feature.

**If already on the correct feature branch** (e.g., `feature/P2-002-auto-scheduling-vendors`), continue.

**If on a different feature branch or main**, create/switch to the feature branch:
```bash
# CRITICAL: Always branch from current HEAD, never from main.
# This preserves all committed task files and code from prior features.
git checkout -b feature/<feature-name>-<first-task-id>
```

**Why from HEAD, not main?** Task files for future features are committed on the current branch. Branching from `main` would lose them — this was the cause of the overnight task loss on 2026-04-10.

### 7. Move Feature Plan to In-Progress (if needed)

If the task's `feature` field matches a plan in `features/planned/`, move it to `features/inprogress/` and create the `backlog/`, `doing/`, `done/` subdirectories:
```bash
mv features/planned/P*-<feature>/ features/inprogress/
mkdir -p features/inprogress/P*-<feature>/{backlog,doing,done}
```

### 8. Move Task to Doing

```bash
mv features/inprogress/<feature>/backlog/<task-file> features/inprogress/<feature>/doing/
```

### 9. Execute Task

Read the task file thoroughly. Follow all acceptance criteria. Implement the task.

### 10. Test

Run the project test suite. All tests must pass before marking complete.

### 11. Complete Task

Move the task file to `done/`:
```bash
mv features/inprogress/<feature>/doing/<task-file> features/inprogress/<feature>/done/
```

If no more tasks remain in `backlog/` for this feature, move the entire feature to completed:
```bash
mv features/inprogress/<feature>/ features/completed/
```

### 12. Commit

```bash
git add <changed files>
git commit -m "T-NNN: <task title>"
```

### 13. Report

- Task completed: ID + title
- Files changed
- Tests: pass/fail
- Next task available (or backlog empty)
