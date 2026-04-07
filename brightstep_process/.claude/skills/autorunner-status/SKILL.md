---
name: autorunner-status
description: Check the status of the autonextstep.py task runner — shows current task, progress, blockers, and remaining tasks.
user-invocable: true
---

# /autorunner-status — Check Automated Task Runner Status

Displays real-time status of the `autonextstep.py` task runner, including current task, CPU usage, progress metrics, and any blockers.

## What This Checks

1. **Runner Process**: Is `autonextstep.py` still running?
2. **Current Task**: Which task is being executed right now?
3. **CPU Activity**: Is Claude Code actively working or idle?
4. **Progress**: How many tasks completed vs. remaining?
5. **Blockers**: Any PIVOT.md files blocking progress?
6. **Next Tasks**: What's queued up next?

## Quick Summary

Run this command to get a status report like:

```
📊 AUTORUNNER STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Runner Status:        ✅ Running
Started:              17:46 (5 hours ago)
Current Task:         367 (Haiku-update-embedding-pipeline-configurable)
Active Process:       🔄 CPU 16.4% (since 22:09)

Progress:
  Completed:         228 tasks
  Remaining:         43 tasks
  Config:            --max 10 --pause 5

Blockers:            ✅ None (no PIVOT.md)

Next 3 Tasks:
  1. 367 — update-embedding-pipeline-configurable (Haiku) [IN PROGRESS]
  2. 368 — implement-embedding-migrator (Sonnet) [BLOCKED BY 367]
  3. 369 — run-schema-embedding-migration (Haiku) [BLOCKED BY 368]
```

## How It Works

The script checks:
- `ps aux` for running `autonextstep.py` and Claude Code processes
- `plan/Backlog/` directory for pending tasks
- `plan/Doing/` directory for in-progress tasks
- `features/completed/*/` for completed task count
- `plan/PIVOT.md` for blockers
- Git log for recent commits

---

## Implementation

You'll see detailed process info, task queue status, and recommendations for what to do next.

If runner is:
- **🟢 Running**: Everything OK, check back later or interact with the active Claude process if needed
- **🔴 Stopped**: Review the latest git commits to see what was completed, then restart with `python scripts/autonextstep.py --max 5`
- **⚠️ Blocked**: A PIVOT.md exists — read it, address the issue, then run `python scripts/autonextstep.py --unpause`
