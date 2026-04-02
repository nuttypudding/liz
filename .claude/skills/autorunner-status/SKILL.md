---
name: autorunner-status
description: Check the status of the autonextstep.py task runner — shows current task, progress, blockers, and remaining tasks.
---

# /autorunner-status — Runner Status Check

## Checks

### 1. Process Status
```bash
ps aux | grep autonextstep
```

### 2. Current Task
Check `features/inprogress/*/doing/` for any task files (indicates in-progress work).

### 3. Progress
- Count files in `features/inprogress/*/done/` and `features/completed/*/done/` (completed tasks)
- Count files in `features/inprogress/*/backlog/` (remaining tasks)
- Calculate completion percentage

### 4. Blockers
- Check for `features/inprogress/*/PIVOT.md` (pivot blocker)
- Check for `pause_` prefixed files in `features/inprogress/*/backlog/` (paused tasks)

### 5. Next Up
List the next 3 ready tasks from `features/inprogress/*/backlog/` (lowest ID first, dependencies satisfied).

### 6. Recent Activity
```bash
git log --oneline -5
```

## Output

Report:
- Runner: running / stopped
- Current task: (name or none)
- Progress: X/Y tasks complete (Z%)
- Blockers: (any pivots or paused tasks)
- Next 3 tasks queued
- Last 5 commits
