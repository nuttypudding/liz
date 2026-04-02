# BrightStep Development Process

The complete Claude Code development process used by BrightStep.AI. This document is the master reference — it covers every skill, rule, agent, hook, and workflow pattern.

---

## 1. Philosophy

Every process in this system follows four principles (from The E-Myth Revisited):

- **Documented** — Every workflow has a written procedure
- **Repeatable** — Any developer (or AI agent) can follow it with identical results
- **Measurable** — Test coverage, token cost, task completion rates are tracked
- **Scalable** — Works for 1 task or 100 tasks with the automated runner

Core development tenets:
- **Ticket-first**: Every change starts with a ticket in `.claude/tickets.md`
- **Test-first**: Every code change includes tests. `/ship` enforces this
- **Doc-sync**: Documentation stays current via `/update-docs` after every change
- **Cost-aware**: Model tier switching (Haiku for routine, Opus for judgment) controls spend
- **Autonomous-capable**: The autorunner can process the backlog unattended
- **Parallel-by-default**: Independent work uses parallel agents and background tasks

---

## 2. Skills (Slash Commands)

Skills are user-invocable Claude Code commands defined in `.claude/skills/` and `.claude/commands/`.

### Planning & Execution

| Skill | Purpose | Model |
|-------|---------|-------|
| `/plan-feature <name>` | Create a feature plan at `features/planned/<name>/README.md` + ticket + branch | inherit |
| `/create-feature-tasks-in-backlog <name>` | Generate task files from a feature plan into `plan/Backlog/` | inherit |
| `/nextstep [instructions]` | Pick and execute the next backlog task, or run custom instructions | inherit |

### Development

| Skill | Purpose | Model |
|-------|---------|-------|
| `/fix-bug [--ticket T-NNN \| description]` | Ticket-first bug fix — diagnose, branch, fix, test, deploy | inherit |
| `/log-bug <description>` | Log a new bug ticket to `.claude/tickets.md` | inherit |
| `/update-docs [scope]` | Scan git diff and update affected documentation | haiku |
| `/autorunner-status` | Check `autonextstep.py` runner status | haiku |
| `/ship <message>` | Run tests + create missing tests + update docs + commit (user-invoked only) | inherit |
| `/review-changes` | Security & architecture review (read-only, forked) | opus |

### Testing

| Skill | Purpose | Model |
|-------|---------|-------|
| `/test-all [tier]` | Run unit + integration + Playwright UI tests | inherit |
| `/test-fix-dev` | Autonomous local dev testing — discovers, tests, fixes, loops | inherit |
| `/test-fix-prod` | Autonomous production testing — same methodology, targets prod | inherit |
| `/overnight-qa` | Comprehensive overnight QA — all features, visual inspection, loops | inherit |

### Deployment

| Skill | Purpose | Model |
|-------|---------|-------|
| `/deploy-prod` | Deploy to production (PR from branches, direct push from main) | inherit |
| `/notify <message>` | Send a Pushover notification to the user | inherit |
| `/run-dev` | Start Next.js frontend + FastAPI backend for local development | inherit |

### Key Skill Details

#### `/fix-bug`

Ticket-first bug-fixing workflow:

```
/fix-bug --ticket T-002                                    # preferred — use existing ticket
/fix-bug the matching agent returns zero results           # freeform — auto-creates ticket
```

Three input modes: `--ticket T-NNN` (preferred), `--issue N` (legacy), or freeform description. All modes create/link a ticket in `.claude/tickets.md`. Category-aware deployment: `bug-fix-dev` fixes locally; `bug-fix-prod` goes through the full pipeline (fix → test-fix-dev → PR → deploy-prod → test-fix-prod).

#### `/ship`

The safe commit workflow. Never auto-invoked — user must call it explicitly.

```
/ship Add keyword injection to matching agent
```

Steps:
1. Run existing tests (pytest for Python, npm build for TypeScript)
2. Analyze changed source files for missing unit tests — create them
3. Check and update affected docs
4. Stage specific files and commit with the provided message
5. Does NOT push

#### `/review-changes`

Read-only code review running as a forked Opus subagent. Cannot modify files.

Checks: OWASP top 10, DDD violations, missing tests, documentation staleness, code quality.

#### `/test-fix-dev`

Autonomous local dev testing. Discovers all endpoints, invents creative tests (SQL injection, XSS, unicode, validation), runs Playwright E2E (anonymous + authenticated), fixes issues, and loops until everything works. Sends Pushover notification when blocked.

#### `/test-fix-prod`

Same methodology as `/test-fix-dev` but targets production URLs. Verifies Railway backend health, Vercel frontend, env vars, SSE streaming, matching pipeline.

#### `/update-docs`

Scans `git diff` to identify changed files, then updates all affected documentation using a mapping table:

| Change Type | Docs to Update |
|-------------|---------------|
| CLI changes | `docs/cli-usage.md` |
| Infrastructure | `docs/runbook.md` |
| LLM/model changes | `docs/local-llm.md` |
| Agent changes | `docs/architecture.md` |
| Schema changes | `docs/schema.md` |
| Plan changes | `plan/README.md` TOC + `plan/DECISION_LOG.md` |
| Feature status | `features/roadmap.md` |
| Architecture/ports/DB | `plan/system_map.md` |
| Env vars | `.env.example` + referencing docs |

---

## 3. Rules (Path-Scoped)

Rules activate automatically when you edit files matching their path patterns. Defined in `.claude/rules/`.

| Rule | Paths | Key Enforcement |
|------|-------|-----------------|
| `documentation.md` | `docs/**` | Cross-reference consistency, port map accuracy, runnable CLI examples, no stale references |
| `plan-changes.md` | `plan/**` | Always update DECISION_LOG.md, never renumber files, keep TOC in sync, feature roadmap sync |
| `python-backend.md` | `src/**/*.py` | DDD boundaries, `get_settings()` for config, OTEL patterns, asyncpg gotchas, Qwen3 think tags |
| `typescript-frontend.md` | `apps/**/*.{ts,tsx}` | shadcn/ui first, App Router, strict TypeScript (no `any`), Tailwind CSS, 3-phase agent workflow |
| `task-execution.md` | `plan/Backlog/**`, `plan/Doing/**` | Model tier switching (Haiku/Sonnet/Opus), task lifecycle, Docker-first infrastructure |
| `shadcn-workflow.md` | `apps/**/*.{ts,tsx}` | MCP-first: search blocks before building, fetch demos before implementing |
| `chat-ui-samples.md` | `samples/**`, `apps/**/*.{ts,tsx}`, `src/**/*.py` | Always create both Streamlit + Gradio versions for chat features |

### Python Backend Rule — Production Lessons

Key gotchas encoded in the rule (from production debugging):

- **asyncpg bind params**: Never use `::type` casts on bind parameters. Write `:vec` not `:vec::vector`.
- **OTEL singletons**: `TracerProvider` can only be set once per process. In tests, use `exporter.clear()` between tests.
- **httpx keepalive**: Disable for long-running batch ops: `httpx.Limits(max_keepalive_connections=0)`.
- **Qwen3 think tags**: Strip `<think>...</think>` before parsing JSON responses.
- **asyncpg datetime**: Pass `datetime` objects directly, never `.isoformat()` strings.

### Task Execution Rule — Model Tier Switching

Task filenames have a prefix: `Haiku-`, `Sonnet-`, or `Opus-`. The FIRST thing to do before any task is verify you're on the correct model tier. This has been missed multiple times — the rule enforces it as the first acceptance criterion on every task.

---

## 4. Agents (Spawnable Subprocesses)

Agents are defined in `.claude/agents/` and run as isolated subprocesses with specific tools and permissions.

### UI Workflow Agents (3-Phase Pipeline)

| Agent | Phase | Model | Tools | maxTurns | Key Detail |
|-------|-------|-------|-------|----------|------------|
| `ux-designer` | Plan | sonnet | Read, Glob, Grep, Bash + shadcn MCP | 15 | Plan mode only — outputs specs, no code |
| `ui-builder` | Build | sonnet | Read, Write, Edit, Bash, Glob, Grep + shadcn MCP | 30 | bypassPermissions — implements from spec |
| `ui-refiner` | Polish | sonnet | Read, Edit, Glob, Grep + shadcn MCP | 15 | bypassPermissions — minimal edits only |

Workflow: **ux-designer** (plan) → **ui-builder** (implement) → **ui-refiner** (polish). Triggered by the `shadcn-workflow.md` rule for any non-trivial UI work.

### Chat Sample Agents

| Agent | Model | Tools | maxTurns | Output |
|-------|-------|-------|----------|--------|
| `streamlit-chat` | sonnet | Read, Write, Edit, Bash, Glob, Grep | 20 | `samples/chat_streamlit_<feature>.py` |
| `gradio-chat` | sonnet | Read, Write, Edit, Bash, Glob, Grep | 20 | `samples/chat_gradio_<feature>.py` |

Both agents are always triggered together (by `chat-ui-samples.md` rule) whenever chat functionality is requested. They implement the same feature set for side-by-side comparison.

---

## 5. Hook

### Post-Commit Reminder

After any `git commit`, Claude receives a non-blocking reminder:

> "A git commit was just made. Consider running /update-docs to check if any documentation needs updating."

- **Config**: `.claude/settings.json` → `hooks.PostToolUse` → matches `git commit`
- **Script**: `.claude/hooks/post-commit-reminder.sh`
- **Behavior**: Always exits 0 (non-blocking). Purely informational.

---

## 6. Ticket-First Workflow

All features and bug fixes are tracked in **`.claude/tickets.md`**.

### Categories

| Category | Description | Deployment |
|----------|-------------|------------|
| `new-feature` | New functionality | PR-based deploy via `/deploy-prod` |
| `bug-fix-dev` | Bug in local dev only | Fix + test locally, no deploy |
| `bug-fix-prod` | Bug in production | Fix → test-fix-dev → PR → deploy-prod → test-fix-prod |

### Status Lifecycle

```
open → in-progress → testing → pr-open → deployed → closed
```

### Commands

- `/log-bug <description>` — Create a bug ticket (asks dev or prod)
- `/fix-bug --ticket T-NNN` — Work on an existing ticket
- `/fix-bug <description>` — Auto-create ticket + start fixing
- `/plan-feature <name>` — Auto-creates a `new-feature` ticket + branch

### Branch Naming

- Features: `feature/T-NNN-feature-name`
- Bug fixes: `fix/T-NNN-short-description`

---

## 7. Model Tier System

Cost control via model tier switching. Task filenames encode the required tier.

### Classification

| Tier | Prefix | Use For | Cost/Task |
|------|--------|---------|-----------|
| Haiku | `Haiku-` | Routine work: migrations, config, CLI, tests, docs | ~50K–200K tokens |
| Sonnet | `Sonnet-` | Guided implementation with clear design from prior Opus task | ~100K–300K tokens |
| Opus | `Opus-` | Novel architecture, critical judgment, front-end design, validation | ~100K–500K+ tokens |

### Decision Table

| Task Type | Tier |
|-----------|------|
| Database migration | Haiku |
| CLI command addition | Haiku |
| Config file changes | Haiku |
| Test writing | Haiku |
| Documentation updates | Haiku |
| Training run execution | Sonnet |
| API integration | Sonnet |
| Pipeline implementation | Sonnet |
| New frontend page/component | Opus |
| Architecture design | Opus |
| Validation & evaluation | Opus |
| Bug diagnosis (complex) | Opus |

### The Front-End Rule

**Front-end work is always Opus.** UI design decisions, component architecture, and user experience require the strongest reasoning model. This is non-negotiable.

---

## 8. Workflows (End-to-End)

### Feature Development (Full Cycle)

```
1. /plan-feature my-feature          → ticket T-NNN + branch + features/planned/my-feature/README.md
2. /create-feature-tasks-in-backlog  → plan/Backlog/NNN-*.md files
3. /nextstep                         → picks + executes next task (repeat)
4. /ship "Complete feature task"     → tests + docs + commit after each task
5. /review-changes                   → periodic code review
6. /deploy-prod                      → PR merge + deploy
```

### Bug Fix (Production)

```
1. /log-bug <description>            → ticket T-NNN (bug-fix-prod)
2. /fix-bug --ticket T-NNN           → branch fix/T-NNN-* + diagnose + fix + test
                                       → PR + deploy-prod + test-fix-prod → close ticket
```

### Bug Fix (Dev-Only)

```
1. /log-bug <description>            → ticket T-NNN (bug-fix-dev)
2. /fix-bug --ticket T-NNN           → branch fix/T-NNN-* + diagnose + fix + test → close ticket
```

### Documentation Sweep

```
1. /update-docs                      → scan diff, update all affected docs
2. /ship "Update docs"               → commit doc changes
```

### Production Deployment

```
# From a feature/fix branch:
1. /ship "Ready for production"      → tests + docs + commit
2. /deploy-prod                      → push branch + create PR + merge + deploy
3. /test-fix-prod                    → deep test all endpoints + auto-fix

# From main (direct push):
1. /ship "Ready for production"      → tests + docs + commit
2. /deploy-prod                      → push main + deploy
3. /test-fix-prod                    → deep test all endpoints + auto-fix
```

---

## 9. Automated Task Runner

`scripts/autonextstep.py` loops through the backlog, detects each task's model tier from the filename prefix, and launches `claude -p /nextstep` with the correct `--model` flag.

### Usage

```bash
python scripts/autonextstep.py              # Run all ready tasks
python scripts/autonextstep.py --dry-run    # Preview (no execution)
python scripts/autonextstep.py --once       # Run one task, then stop
python scripts/autonextstep.py --max 5      # Run at most 5 tasks
python scripts/autonextstep.py --haiku-only # Only cheap Haiku tasks
python scripts/autonextstep.py --pause 30   # 30s between tasks
```

### Key Design

- Each task is a **separate** `claude -p` session — no history or tokens carry over
- Memory is fully released when each process exits
- Checks `plan/Doing/` first (interrupted work), then lowest-numbered ready backlog task
- Parses `depends_on` YAML frontmatter for dependency resolution
- Checks `features/completed/*/` for satisfied dependencies

### Pivot Support

If a task discovers a fundamental blocker, it creates `plan/PIVOT.md` and renames remaining tasks with a `pause_` prefix. The runner detects this and stops. Resume with:

```bash
python scripts/autonextstep.py --unpause   # Remove pause_ prefix + delete PIVOT.md
```

---

## 10. Agent Offloading Best Practices

### Core Principle

**Offload read-only analysis. Keep read-write execution in main context.**

"Scan files and tell me what you found" → agent. "Edit files based on our conversation" → main context.

### What to Offload

| Task | Agent Type | Why |
|------|-----------|-----|
| Codebase research before implementing | Explore | Prevents 50+ file reads from filling context |
| Lessons Learned lookup | Explore | Large reference docs; agent extracts only relevant lessons |
| Doc-change impact analysis | Explore | Cross-referencing across 7+ files is mechanical |
| Test suite execution | Background Bash | Tests can run while you edit other things |
| Security & architecture review | Explore (forked) | Read-only analysis benefits from isolation |
| Dependency graph analysis | Explore | Scanning completed/backlog dirs is pure file traversal |

### What to Keep in Main Context

| Task | Why |
|------|-----|
| Actual code edits | Needs full conversation history for coherence |
| Commit decisions (`/ship`) | User-controlled, shouldn't be delegated |
| Architecture planning | Needs iterative user Q&A |
| Task implementation (coding) | Read → edit → test cycles require continuity |
| Bug fix implementation | Fix depends on diagnosis context |

### How Skills Use Agents

- **`/fix-bug`**: Spawns **two parallel Explore agents** (Lessons Learned + codebase scan), then fixes in main context
- **`/update-docs`**: Spawns **one Explore agent** for impact analysis, then applies edits in main context
- **`/ship`**: Runs **tests + coverage analysis + doc analysis in parallel**, then creates missing tests in main context
- **`/review-changes`**: Runs entirely as a **forked Explore agent** (cannot modify files)

### Parallel Agent Pattern

Always launch independent agents in a single message for maximum parallelism:

```
Good:  Task(agent A) + Task(agent B) in ONE message  → run simultaneously
Bad:   Task(agent A), wait, Task(agent B)             → sequential, wastes time
```

---

## 11. Concurrent Sessions (Git Worktrees)

Two Claude Code instances can work simultaneously without conflicts using git worktrees.

| Session | Worktree | Branch | Owns |
|---------|----------|--------|------|
| A (Frontend) | Primary | `main` or `feature/*` | `apps/`, `src/*/student/` |
| B (Backend/Pipeline) | `.claude/worktrees/` | `pipeline/*` | `src/*/enrichment/`, `scripts/` |

**Shared files** (`db/`, `config.py`, `agents/`) should only be edited by one session at a time.

---

## 12. Directory Structure

```
project/
├── .claude/
│   ├── settings.json                    # Hooks config (committed)
│   ├── settings.local.json              # Permissions (gitignored)
│   ├── tickets.md                       # Ticket tracker
│   ├── commands/                        # Legacy skills
│   │   ├── nextstep.md
│   │   ├── plan-feature.md
│   │   └── create-feature-tasks-in-backlog.md
│   ├── skills/                          # Skills (slash commands)
│   │   ├── fix-bug/SKILL.md
│   │   ├── log-bug/SKILL.md
│   │   ├── update-docs/SKILL.md
│   │   ├── ship/SKILL.md
│   │   ├── review-changes/SKILL.md
│   │   ├── deploy-prod/SKILL.md
│   │   ├── test-all/SKILL.md
│   │   ├── test-fix-dev/SKILL.md
│   │   ├── test-fix-prod/SKILL.md
│   │   ├── run-dev/SKILL.md
│   │   ├── overnight-qa/SKILL.md
│   │   ├── notify/SKILL.md
│   │   ├── autorunner-status/SKILL.md
│   │   └── brightstep-process/SKILL.md
│   ├── agents/                          # Spawnable subagents
│   │   ├── ux-designer.md
│   │   ├── ui-builder.md
│   │   ├── ui-refiner.md
│   │   ├── streamlit-chat.md
│   │   └── gradio-chat.md
│   ├── rules/                           # Path-scoped rules
│   │   ├── documentation.md
│   │   ├── plan-changes.md
│   │   ├── python-backend.md
│   │   ├── typescript-frontend.md
│   │   ├── task-execution.md
│   │   ├── shadcn-workflow.md
│   │   └── chat-ui-samples.md
│   └── hooks/
│       └── post-commit-reminder.sh
├── plan/
│   ├── README.md                        # Plan entry point + TOC
│   ├── DECISION_LOG.md                  # Decision audit trail
│   ├── Backlog/                         # Pending tasks
│   ├── Doing/                           # In-progress tasks
│   └── *.md                             # Plan section files
├── features/
│   ├── roadmap.md                       # Feature tracking
│   ├── planned/<name>/README.md         # Upcoming features
│   └── completed/<name>/               # Archived task files
├── docs/
│   └── workflow.md                      # Development workflow guide
├── scripts/
│   └── autonextstep.py                 # Automated task runner
└── CLAUDE.md                            # Project instructions for Claude Code
```

---

## 13. Configuration Files

### settings.json (Committed)

Contains hooks and plugin configuration. Committed to git so all collaborators share the same hooks.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/post-commit-reminder.sh \"$TOOL_INPUT\"",
            "blocking": false
          }
        ]
      }
    ]
  }
}
```

### settings.local.json (Gitignored)

Contains permission allowlists. Each developer customizes their own. See `settings.local.json.example` for a starter template.

### tickets.md

Centralized ticket tracker. See `tickets.md.template` for the format. Categories: `new-feature`, `bug-fix-dev`, `bug-fix-prod`.

### Task File Format

Task files in `plan/Backlog/` use YAML frontmatter:

```markdown
---
id: 123
title: Implement user authentication
tier: Opus
depends_on: [120, 121]
feature: user-auth
---

# 123 — Implement User Authentication

## Objective
...

## Acceptance Criteria
1. [ ] Verify correct model tier (Opus)
2. [ ] ...
```

Filename convention: `{id:03d}-{Tier}-{kebab-case-title}.md` (e.g., `123-Opus-implement-user-auth.md`).

### Feature Plan Format

Feature plans live at `features/planned/<name>/README.md`:

```markdown
# Feature: <Name>

## Summary
...

## Architecture
...

## Tasks
Generated by `/create-feature-tasks-in-backlog <name>`

## Dependencies
...
```
