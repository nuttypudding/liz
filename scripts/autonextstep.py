#!/usr/bin/env python3
"""Auto-run /nextstep with the correct model tier (Haiku, Sonnet, or Opus).

Reads the backlog, finds the next ready task, detects the model tier
from the filename prefix, and launches Claude Code with the right --model flag.
Loops until the backlog is empty or all remaining tasks are blocked.

Each `claude -p` invocation is a SEPARATE session — no conversation history
or context carries over between tasks. Memory is fully released when each
claude process exits.

TASK DIRECTORY STRUCTURE:
  Tasks live inside their feature directory:
    features/inprogress/<feature>/backlog/   ← pending tasks
    features/inprogress/<feature>/doing/     ← current task (max 1)
    features/inprogress/<feature>/done/      ← completed tasks

PIVOT SUPPORT:
  If a task discovers a fundamental blocker, it can trigger a pivot by:
  1. Creating features/inprogress/<feature>/PIVOT.md with the reason
  2. Renaming remaining backlog tasks with a pause_ prefix
  The runner detects PIVOT.md and stops the loop automatically.
  Use --unpause to resume after addressing the issue.

TOKEN USAGE WARNING:
  Each task consumes tokens independently. Rough estimates per task:
    Haiku task:  ~50K-200K tokens  (cheapest model, routine work)
    Sonnet task: ~75K-300K tokens  (mid-tier model, guided implementation)
    Opus task:   ~100K-500K+ tokens (most capable model, complex work)
  On Opus Max 5x plan, monitor your usage at https://console.anthropic.com.
  Use --haiku-only or --max to control spend.

Usage (from repo root):
    python scripts/autonextstep.py              # Loop through all ready tasks
    python scripts/autonextstep.py --once        # Run only the next task, then stop
    python scripts/autonextstep.py --dry-run     # Show all ready tasks without executing
    python scripts/autonextstep.py --max 5       # Run at most 5 tasks, then stop
    python scripts/autonextstep.py --haiku-only  # Skip Opus tasks (save tokens)
    python scripts/autonextstep.py --final-test  # Run /test-fix-dev after backlog is empty
    python scripts/autonextstep.py --unpause     # Resume after a pivot
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FEATURES_DIR = REPO_ROOT / "features"
INPROGRESS_DIR = FEATURES_DIR / "inprogress"
COMPLETED_DIR = FEATURES_DIR / "completed"
STATUS_FILE = REPO_ROOT / ".claude" / "autonextstep_status.json"

DEFAULT_TASK_TIMEOUT_MINS = 90  # kill the claude process after this many minutes


def ts() -> str:
    """Return a short HH:MM:SS timestamp string."""
    return datetime.now().strftime("%H:%M:%S")


def write_status(data: dict) -> None:
    """Write runner state to .claude/autonextstep_status.json for external monitoring."""
    data["updated_at"] = datetime.now().isoformat()
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATUS_FILE.write_text(json.dumps(data, indent=2))

PUSHOVER_TOKEN = "ahfefqbmiywgyhah4gizmdzre7enta"
PUSHOVER_USER = "u1xaswoavfko3jjne9aex27vkfg8fv"


def send_pushover(title: str, message: str, priority: int = 0) -> bool:
    """Send a Pushover notification. Returns True on success."""
    try:
        data = urllib.parse.urlencode({
            "token": PUSHOVER_TOKEN,
            "user": PUSHOVER_USER,
            "title": title[:50],
            "message": message[:500],
            "priority": str(priority),
        }).encode()
        req = urllib.request.Request("https://api.pushover.net/1/messages.json", data=data)
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        print(f"  Pushover notification failed: {e}")
        return False


def _iter_feature_dirs(base: Path):
    """Yield feature directories under a base path (inprogress or completed)."""
    if not base.exists():
        return
    for d in sorted(base.iterdir()):
        if d.is_dir() and not d.name.startswith("."):
            yield d


def get_completed_ids() -> set[str]:
    """Collect all completed task IDs from features/inprogress/*/done/ and features/completed/*/done/."""
    ids: set[str] = set()
    for base in [INPROGRESS_DIR, COMPLETED_DIR]:
        for feature_dir in _iter_feature_dirs(base):
            done_dir = feature_dir / "done"
            if not done_dir.exists():
                continue
            for f in done_dir.iterdir():
                if f.suffix == ".md" and f.name != "README.md":
                    match = re.match(r"^(\d+)", f.name)
                    if match:
                        ids.add(match.group(1).lstrip("0") or "0")
    return ids


def parse_frontmatter(path: Path) -> dict:
    """Extract YAML frontmatter fields from a task file."""
    text = path.read_text()
    fm: dict = {}
    in_fm = False
    for line in text.splitlines():
        if line.strip() == "---":
            if in_fm:
                break
            in_fm = True
            continue
        if in_fm:
            m = re.match(r'^(\w+):\s*(.+)$', line)
            if m:
                key, val = m.group(1), m.group(2).strip()
                if val.startswith("["):
                    items = re.findall(r'"?(\d+)"?', val)
                    fm[key] = items
                else:
                    fm[key] = val.strip('"').strip("'")
    return fm


def detect_tier(filename: str) -> str | None:
    """Extract Haiku, Sonnet, or Opus from filename like '155-Haiku-test-groq.md'."""
    match = re.match(r"^\d+-(\w+)-", filename)
    if match:
        tier = match.group(1).lower()
        if tier in ("haiku", "sonnet", "opus"):
            return tier
    return None


def check_pivot() -> str | None:
    """Check for PIVOT.md in any in-progress feature and return its content, or None."""
    for feature_dir in _iter_feature_dirs(INPROGRESS_DIR):
        pivot_file = feature_dir / "PIVOT.md"
        if pivot_file.exists():
            return f"[{feature_dir.name}] {pivot_file.read_text().strip()}"
    return None


def check_auth() -> bool:
    """Return True if claude OAuth session is active, False if logged out."""
    try:
        result = subprocess.run(
            ["claude", "auth", "status"],
            capture_output=True, text=True, timeout=10,
        )
        # Try JSON first (some versions output JSON)
        try:
            data = json.loads(result.stdout)
            return bool(data.get("loggedIn", False))
        except (ValueError, KeyError):
            pass
        # Fall back to text scan
        combined = (result.stdout + result.stderr).lower()
        if "logged in" in combined or "authenticated" in combined:
            return True
        if "not logged in" in combined or "unauthenticated" in combined:
            return False
        # If the command succeeded (exit 0) and nothing says "not logged in", assume ok
        return result.returncode == 0
    except Exception:
        return False


def unpause_tasks() -> int:
    """Remove pause_ prefix from all paused backlog tasks across all features. Returns count."""
    count = 0
    for feature_dir in _iter_feature_dirs(INPROGRESS_DIR):
        backlog_dir = feature_dir / "backlog"
        if not backlog_dir.exists():
            continue
        for f in sorted(backlog_dir.iterdir()):
            if f.name.startswith("pause_") and f.suffix == ".md":
                original_name = f.name[len("pause_"):]
                f.rename(backlog_dir / original_name)
                count += 1
        # Also remove PIVOT.md if it exists
        pivot_file = feature_dir / "PIVOT.md"
        if pivot_file.exists():
            pivot_file.unlink()
            print(f"  Removed {pivot_file.relative_to(REPO_ROOT)}")
    return count


def find_doing_task() -> Path | None:
    """Check if there's a task in any features/inprogress/*/doing/ (interrupted work)."""
    for feature_dir in _iter_feature_dirs(INPROGRESS_DIR):
        doing_dir = feature_dir / "doing"
        if not doing_dir.exists():
            continue
        tasks = sorted(
            f for f in doing_dir.iterdir()
            if f.suffix == ".md" and f.name != "README.md"
            and not f.name.startswith("pause_")
        )
        if tasks:
            return tasks[0]
    return None


def get_all_ready_tasks(completed_ids: set[str]) -> list[Path]:
    """Find all backlog tasks with dependencies satisfied across all features, sorted by ID."""
    all_tasks = []
    for feature_dir in _iter_feature_dirs(INPROGRESS_DIR):
        backlog_dir = feature_dir / "backlog"
        if not backlog_dir.exists():
            continue
        tasks = sorted(
            f for f in backlog_dir.iterdir()
            if f.suffix == ".md" and f.name != "README.md"
            and not f.name.startswith("pause_")
            and re.match(r"^\d+", f.name)
        )
        all_tasks.extend(tasks)

    # Sort all tasks across features by their numeric ID
    all_tasks.sort(key=lambda p: int(re.match(r"^(\d+)", p.name).group(1)))

    ready = []
    for task_path in all_tasks:
        fm = parse_frontmatter(task_path)
        deps = fm.get("depends_on", [])
        all_satisfied = all((dep.lstrip("0") or "0") in completed_ids for dep in deps)
        if all_satisfied:
            ready.append(task_path)

    return ready


def find_next_backlog_task(
    completed_ids: set[str],
    skip: set[str] | None = None,
    tier_filter: str | None = None,
) -> Path | None:
    """Find the lowest-numbered ready backlog task across all features."""
    skip = skip or set()
    for task_path in get_all_ready_tasks(completed_ids):
        match = re.match(r"^(\d+)", task_path.name)
        if not match or match.group(1) in skip:
            continue
        if tier_filter:
            tier = detect_tier(task_path.name)
            if tier != tier_filter:
                continue
        return task_path
    return None


def pick_next_task(
    skip: set[str] | None = None,
    tier_filter: str | None = None,
) -> tuple[Path | None, str]:
    """Find the next task to run. Returns (path, source_label) or (None, reason)."""
    # Priority 1: Interrupted work in any doing/ directory
    doing_task = find_doing_task()
    if doing_task:
        if tier_filter:
            tier = detect_tier(doing_task.name)
            if tier != tier_filter:
                return None, (
                    f"Task in doing/ is {tier} but --{tier_filter}-only is set. "
                    f"Finish or move it manually: {doing_task.name}"
                )
        feature_name = doing_task.parent.parent.name
        return doing_task, f"{feature_name}/doing (resuming interrupted work)"

    # Priority 2: Next ready backlog task
    completed_ids = get_completed_ids()
    backlog_task = find_next_backlog_task(completed_ids, skip=skip, tier_filter=tier_filter)
    if backlog_task:
        feature_name = backlog_task.parent.parent.name
        return backlog_task, f"{feature_name}/backlog"

    filter_msg = f" (filtered to {tier_filter} only)" if tier_filter else ""
    return None, f"No ready tasks{filter_msg} — backlog empty or all blocked"


def verify_task_exists(task_path: Path) -> bool:
    """Verify a task file still exists on disk before running it.

    The task file may have been lost during a branch switch (e.g., branching
    from main instead of HEAD). This check prevents the runner from invoking
    /nextstep when the task it expects is missing.
    """
    if not task_path.exists():
        print(f"  ERROR: Task file missing: {task_path.relative_to(REPO_ROOT)}")
        print("  This usually means the current branch was created from main")
        print("  instead of from the branch that has the task files.")
        print("  Fix: checkout the task files from the branch that has them,")
        print("  or rebase onto the branch with committed task files.")
        return False
    return True


def run_task(
    task_path: Path,
    source: str,
    *,
    dry_run: bool = False,
    force_model: str | None = None,
    timeout_mins: int = DEFAULT_TASK_TIMEOUT_MINS,
) -> int:
    """Run a single task. Returns the process exit code (0 = success)."""
    tier = detect_tier(task_path.name)
    if not tier:
        print(f"  Could not detect tier from filename: {task_path.name}")
        print("  Expected format: NNN-{Haiku|Sonnet|Opus}-slug.md")
        return 1

    model = force_model if force_model else tier

    fm = parse_frontmatter(task_path)
    task_id = fm.get("id", "?")
    title = fm.get("title", task_path.stem)

    print(f"  Task:     #{task_id} — {title}")
    print(f"  Source:   {source}")
    if force_model:
        print(f"  Model:    {model} (forced, file says {tier})")
    else:
        print(f"  Model:    {model}")
    print(f"  File:     {task_path.relative_to(REPO_ROOT)}")
    print(f"  Timeout:  {timeout_mins} min")

    cmd = [
        "claude",
        "--model", model,
        "--dangerously-skip-permissions",
        "-p", "/nextstep",
    ]

    print(f"  Command:  {' '.join(cmd)}")
    print(f"[{ts()}] Task started")
    print()

    if dry_run:
        return 0

    os.chdir(REPO_ROOT)
    task_start = time.time()
    try:
        result = subprocess.run(cmd, timeout=timeout_mins * 60)
        elapsed_min = (time.time() - task_start) / 60
        print(f"\n[{ts()}] Task finished in {elapsed_min:.1f} min (exit {result.returncode})")
        return result.returncode
    except subprocess.TimeoutExpired:
        elapsed_min = (time.time() - task_start) / 60
        print(f"\n[{ts()}] TIMEOUT — task exceeded {timeout_mins} min limit ({elapsed_min:.1f} min elapsed). Process killed.")
        return 124  # same as bash timeout exit code


def main():
    parser = argparse.ArgumentParser(
        description="Auto-run /nextstep with the correct model tier. "
        "Loops until the backlog is empty or all tasks are blocked.",
        epilog=(
            "TOKEN USAGE: Each task is a separate claude session (no memory "
            "carries over). Rough cost per task: Haiku ~50K-200K tokens, "
            "Sonnet ~75K-300K tokens, Opus ~100K-500K+ tokens. "
            "Use --haiku-only, --sonnet-only, or --max to control spend."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show all ready tasks without executing.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run only the next task, then stop (no loop).",
    )
    parser.add_argument(
        "--max",
        type=int,
        default=0,
        metavar="N",
        help="Run at most N tasks, then stop. 0 = unlimited (default).",
    )
    parser.add_argument(
        "--haiku-only",
        action="store_true",
        help="Only run Haiku-tier tasks. Skip Sonnet and Opus tasks to save tokens.",
    )
    parser.add_argument(
        "--sonnet-only",
        action="store_true",
        help="Only run Sonnet-tier tasks. Skip Haiku and Opus tasks.",
    )
    parser.add_argument(
        "--opus-only",
        action="store_true",
        help="Only run Opus-tier tasks. Skip Haiku and Sonnet tasks.",
    )
    parser.add_argument(
        "--stop-on-failure",
        action="store_true",
        help="Stop the loop if a task exits with non-zero code.",
    )
    parser.add_argument(
        "--pause",
        type=int,
        default=0,
        metavar="SECS",
        help="Pause N seconds between tasks (default: 0). "
        "Useful to check usage at console.anthropic.com between runs.",
    )
    parser.add_argument(
        "--unpause",
        action="store_true",
        help="Remove pause_ prefix from all paused tasks and delete PIVOT.md, then exit.",
    )
    parser.add_argument(
        "--force-model",
        type=str,
        default=None,
        metavar="MODEL",
        help="Override the model tier for ALL tasks (e.g., --force-model opus). "
        "Ignores the Haiku/Sonnet/Opus prefix in filenames and runs everything with this model.",
    )
    parser.add_argument(
        "--final-test",
        action="store_true",
        help="After all backlog tasks complete, run /test-fix-dev as a comprehensive "
        "final QA sweep. Recommended for overnight runs.",
    )
    parser.add_argument(
        "--final-test-model",
        type=str,
        default="sonnet",
        metavar="MODEL",
        help="Model to use for the final /test-fix-dev run (default: sonnet).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TASK_TIMEOUT_MINS,
        metavar="MINS",
        help=f"Kill a task if it runs longer than this many minutes (default: {DEFAULT_TASK_TIMEOUT_MINS}). "
        "Prevents hung claude processes from blocking the runner indefinitely.",
    )
    parser.add_argument(
        "--notify",
        action="store_true",
        help="Send a Pushover notification when the run finishes (success or failure).",
    )
    args = parser.parse_args()

    # Handle --unpause immediately and exit
    if args.unpause:
        count = unpause_tasks()
        if count > 0:
            print(f"Unpaused {count} task(s).")
        else:
            print("No paused tasks found.")
        sys.exit(0)

    tier_only_flags = [args.haiku_only, args.sonnet_only, args.opus_only]
    if sum(tier_only_flags) > 1:
        print("Error: --haiku-only, --sonnet-only, and --opus-only are mutually exclusive.")
        sys.exit(1)

    tier_filter = None
    if args.haiku_only:
        tier_filter = "haiku"
    elif args.sonnet_only:
        tier_filter = "sonnet"
    elif args.opus_only:
        tier_filter = "opus"

    tasks_run = 0
    tasks_failed = 0
    max_tasks = args.max if args.max > 0 else float("inf")
    start_time = time.time()
    processed_ids: set[str] = set()

    write_status({"status": "starting", "tasks_done": 0, "tasks_failed": 0})

    mode_parts = []
    if args.dry_run:
        mode_parts.append("dry run")
    elif args.once:
        mode_parts.append("once")
    elif args.max:
        mode_parts.append(f"loop (max {args.max})")
    else:
        mode_parts.append("loop until done")
    if tier_filter:
        mode_parts.append(f"{tier_filter} only")
    if args.force_model:
        mode_parts.append(f"force model: {args.force_model}")
    if args.final_test:
        mode_parts.append(f"final /test-fix-dev ({args.final_test_model})")
    if args.notify:
        mode_parts.append("pushover notify")

    print("=" * 60)
    print("  BrightStep.AI — Auto Next Step Runner")
    print(f"  Mode:    {', '.join(mode_parts)}")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    if not args.dry_run:
        print()
        print("  Each task is a separate session (no memory carries over).")
        print("  Monitor usage: https://console.anthropic.com")
    print("=" * 60)
    print()

    # Check for existing pivot before starting
    pivot_msg = check_pivot()
    if pivot_msg and not args.dry_run:
        print("!" * 60)
        print("  PIVOT DETECTED — a previous task triggered a pivot.")
        print("!" * 60)
        print()
        print(pivot_msg)
        print()
        print("  To resume: python scripts/autonextstep.py --unpause")
        print()
        sys.exit(2)

    while tasks_run < max_tasks:
        skip = processed_ids if args.dry_run else None
        task_path, source = pick_next_task(skip=skip, tier_filter=tier_filter)

        if task_path is None:
            print(f"Stopping: {source}")
            break

        match = re.match(r"^(\d+)", task_path.name)
        if match:
            processed_ids.add(match.group(1))

        iteration = tasks_run + 1
        print(f"--- Task {iteration} {'(dry run) ' if args.dry_run else ''}---")

        # Auth check before each task
        if not args.dry_run and not check_auth():
            print(f"[{ts()}] AUTH EXPIRED — claude OAuth session is not active.")
            print("  Run: claude auth login")
            print("  Then restart: python scripts/autonextstep.py")
            write_status({"status": "auth_error", "tasks_done": tasks_run, "tasks_failed": tasks_failed})
            break

        # Pre-flight: verify the task file exists on the current branch.
        # Task files can go missing if a branch was created from main instead
        # of from HEAD (which carries forward committed task files).
        if not args.dry_run and not verify_task_exists(task_path):
            tasks_failed += 1
            write_status({
                "status": "missing_task",
                "missing_file": str(task_path.relative_to(REPO_ROOT)),
                "tasks_done": tasks_run,
                "tasks_failed": tasks_failed,
            })
            print("Stopping: task file missing — likely a branch issue.")
            break

        fm = parse_frontmatter(task_path)
        write_status({
            "status": "running",
            "current_task_id": fm.get("id", "?"),
            "current_task_title": fm.get("title", task_path.stem),
            "current_task_file": str(task_path.relative_to(REPO_ROOT)),
            "tasks_done": tasks_run,
            "tasks_failed": tasks_failed,
        })

        exit_code = run_task(
            task_path, source,
            dry_run=args.dry_run,
            force_model=args.force_model,
            timeout_mins=args.timeout,
        )
        tasks_run += 1

        if exit_code == 124:
            tasks_failed += 1
            print(f"  Task timed out after {args.timeout} min. Stopping to avoid runaway spend.")
            write_status({"status": "timeout", "tasks_done": tasks_run, "tasks_failed": tasks_failed})
            break
        elif exit_code != 0:
            tasks_failed += 1
            print(f"  Task exited with code {exit_code}")
            if args.stop_on_failure:
                print("Stopping: --stop-on-failure is set")
                break
            print("  Continuing to next task...")
            print()

        # Check if the task triggered a pivot
        if not args.dry_run:
            pivot_msg = check_pivot()
            if pivot_msg:
                print()
                print("!" * 60)
                print("  PIVOT TRIGGERED by task execution")
                print("!" * 60)
                print()
                print(pivot_msg)
                print()
                print("  Remaining backlog tasks have been paused (pause_ prefix).")
                print("  To resume: python scripts/autonextstep.py --unpause")
                break

        if args.once:
            break

        if not args.dry_run and task_path is not None:
            pause = max(args.pause, 2)
            if args.pause > 2:
                print(f"  Pausing {args.pause}s before next task (--pause)...")
            print()
            time.sleep(pause)

    # Final test sweep
    final_test_exit = None
    if args.final_test and tasks_run > 0 and tasks_failed == 0:
        pivot_msg = check_pivot()
        if not pivot_msg:
            print()
            print("=" * 60)
            print("  FINAL TEST SWEEP — /test-fix-dev")
            print(f"  Model: {args.final_test_model}")
            print("=" * 60)
            print()

            final_cmd = [
                "claude",
                "--model", args.final_test_model,
                "--dangerously-skip-permissions",
                "-p", "/test-fix-dev",
            ]
            print(f"  Command: {' '.join(final_cmd)}")
            print()

            if not args.dry_run:
                os.chdir(REPO_ROOT)
                result = subprocess.run(final_cmd)
                final_test_exit = result.returncode
                if final_test_exit != 0:
                    print(f"  /test-fix-dev exited with code {final_test_exit}")
            else:
                print("  (dry run — skipping)")
                final_test_exit = 0
    elif args.final_test and tasks_failed > 0:
        print()
        print("  Skipping /test-fix-dev — task failures occurred during run.")
    elif args.final_test and tasks_run == 0:
        print()
        print("  Skipping /test-fix-dev — no tasks were run.")

    # Summary
    elapsed = time.time() - start_time
    overall_failed = tasks_failed > 0 or (final_test_exit is not None and final_test_exit != 0)
    write_status({
        "status": "failed" if overall_failed else "done",
        "tasks_done": tasks_run,
        "tasks_failed": tasks_failed,
        "elapsed_min": round(elapsed / 60, 1),
    })
    print()
    print("=" * 60)
    print(f"  Done. {tasks_run} task(s) processed, {tasks_failed} failed.")
    if final_test_exit is not None:
        status = "PASSED" if final_test_exit == 0 else "FAILED"
        print(f"  Final test sweep: {status}")
    print(f"  Elapsed: {elapsed / 60:.1f} minutes")
    print(f"  Status file: {STATUS_FILE.relative_to(REPO_ROOT)}")
    print("=" * 60)

    # Pushover notification
    if args.notify and not args.dry_run:
        if tasks_failed == 0 and (final_test_exit is None or final_test_exit == 0):
            send_pushover(
                "BrightStep: Run Complete",
                f"{tasks_run} tasks done, 0 failed. "
                f"{'Final QA passed. ' if final_test_exit == 0 else ''}"
                f"Elapsed: {elapsed / 60:.1f}min.",
                priority=-1,
            )
        else:
            send_pushover(
                "BrightStep: Run Needs Attention",
                f"{tasks_run} tasks, {tasks_failed} failed. "
                f"{'Final QA failed. ' if final_test_exit and final_test_exit != 0 else ''}"
                f"Check terminal.",
                priority=1,
            )

    sys.exit(1 if overall_failed else 0)


if __name__ == "__main__":
    main()
