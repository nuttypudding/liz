# BrightStep.AI — Next Step Runner

> **Usage**: `/nextstep` or `/nextstep <instructions>`
> This file is self-contained. No additional context needed.
>
> **Optional arguments**: Pass free-text instructions after `/nextstep` to override the default behavior.
> Examples:
> - `/nextstep` — Pick and execute the next backlog task (default)
> - `/nextstep fix the cooking matching issue` — Fix a specific bug
> - `/nextstep add dark mode to the dashboard` — Implement a quick feature
> - `/nextstep tasks 097 098 099` — Run specific backlog tasks by number
> - `/nextstep but do this: add OpenAI support to matching` — Override with custom work

---

## Instructions for Claude

You are continuing the BrightStep.AI build.

### Check for Override Instructions

**If the user passed arguments after `/nextstep`**, those are override instructions. In that case:
1. Still read **all learnings** first (Step 0 — `plan/Learnings/L*.md` + legacy Lessons Learned)
2. Still read the **Project Context** section for file paths and tech stack
3. **Skip Steps 1–3** (task picking) and go directly to implementing the user's request
4. Follow the same quality standards: run tests, update documentation, update DECISION_LOG if architectural
5. When done, report what was done and ask if there's anything else

**If no arguments were passed**, follow the standard steps below **exactly** in order:

### Step 0: Read All Learnings

**Before doing anything else**, read ALL learning files from `plan/Learnings/`:

```bash
# Read every learning file — these are hard-won fixes from previous tasks
for f in plan/Learnings/L*.md; do
  [ -f "$f" ] && cat "$f"
done
```

These are structured, per-task lessons with Problem/Solution/Apply-when sections. Each file is ~10 lines — reading all of them costs minimal context but prevents repeating expensive mistakes.

Also scan the **Lessons Learned** section at the bottom of this file for additional legacy lessons (L01-L24).

### Step 1: Assess Current State

```
ls features/completed/               # completed features
ls plan/Doing/                        # interrupted/in-progress tasks
ls plan/Backlog/                      # pending tasks (ignore nextstep.md)
```

### Step 2: Resume or Pick Next Task

**If anything is in `plan/Doing/`:**
- A task was interrupted. Read the file to understand what was being worked on.
- Check if the work is actually complete (e.g., run verification commands from the acceptance criteria).
  - If complete: check all boxes, move to the appropriate `features/completed/<feature>/` directory, then proceed to Step 3.
  - If incomplete: resume the work. Do NOT start over — check what already exists and continue from there.

**If `plan/Doing/` is empty:**
- Proceed to Step 3.

### Step 3: Pick the Next Task from Backlog

Read each task file's YAML frontmatter to find the **lowest-numbered task whose dependencies are all satisfied**.

```bash
# Quick dependency check — list all completed task IDs across all features
ls features/completed/*/   # all completed IDs from all features
```

A dependency is satisfied if a file matching that ID exists in **any** `features/completed/<feature>/` directory.

**Rules:**
- Never skip a ready task to work on a later one
- If a task's dependencies aren't met, it's blocked — skip it and check the next
- If ALL remaining tasks are blocked, report what's blocking and stop

### Step 4: Execute the Task

1. **Move** the task file: `mv plan/Backlog/NNN-name.md plan/Doing/NNN-name.md`
2. **Read** the full task file (description + acceptance criteria)
3. **Pre-flight checks** before implementing:
   - **Model tier (MANDATORY — applies to BOTH manual `/nextstep` and autorunner)**: Check the task filename prefix. If it contains `Haiku-`, run `/model haiku`. If it contains `Sonnet-`, run `/model sonnet`. If it contains `Opus-`, run `/model opus`. **Do NOT proceed until you have switched to the correct model.** This applies even in manual interactive sessions — you MUST switch models, not skip the switch because "I'm already on Opus". This controls cost — Haiku tasks are routine work, Sonnet tasks are moderate complexity with clear design constraints, and Opus tasks require novel architecture or critical judgment.

   - **Opus credit gate (MANDATORY for Opus tasks)**: If the task requires Opus but you cannot switch to Opus (e.g., credits are exhausted, rate-limited, or the model is unavailable), **do NOT attempt the task on a lesser model**. Instead:
     1. **Move the task back** to the backlog: `mv plan/Doing/NNN-name.md plan/Backlog/NNN-name.md`
     2. **Trigger the Pivot Protocol** (see below) with reason: "Opus credits exhausted — cannot run Opus-tier task #NNN. Pausing all tasks until Opus is available again."
     3. **Exit immediately** — do not attempt the task on Haiku or any other model.
     This prevents wasting tokens on work that will be low quality and likely need to be redone.
   - **Docker-first**: If the task involves installing/setting up a service, it MUST use Docker (`infrastructure/docker-compose.yml`). If the task file says "install locally" or "install on DGX Spark", update the task description and acceptance criteria to use Docker instead, then proceed.
   - **Plan alignment**: If the task file contradicts the plan docs (`plan/15-mvp-zero-ikigai.md`, `plan/06-tech-stack.md`, etc.), update the task file AND the plan docs to be consistent before implementing.
4. **Implement** everything described
5. **Verify** every acceptance criterion — run actual commands to confirm
6. **Test gate (MANDATORY)** — Run only the tests affected by your changes. **NEVER run the full test suite** — it takes too long and wastes tokens/time.
   - **Step A — Identify affected tests**: Look at the files you created or modified. Map them to test files:
     - `src/brightstep/<module>/<file>.py` → `tests/test_<file>.py` or `tests/test_<module>.py`
     - `src/brightstep/matching_v2/*.py` → `tests/test_<matching_v2_file>.py`
     - `src/brightstep/enrichment/*.py` → `tests/test_<enrichment_file>.py`
     - `src/brightstep/cli/*.py` → `tests/test_cli.py`, `tests/test_cli_output.py`
     - `src/brightstep/db/models/*.py` → `tests/test_<model>.py` (if exists)
     - `src/brightstep/config.py` → `tests/test_config.py`
     - If you modified a shared module (e.g., `db/connection.py`, `config.py`), also run tests for modules that import it — but limit to 3-5 most relevant test files, not the entire suite.
   - **Step B — Run task-specific tests**: Run ONLY the identified test files:
     ```bash
     .venv/bin/python -m pytest tests/test_<your_module>.py tests/test_<related>.py -v
     ```
   - **Step C — Quick import check** (only if you modified `__init__.py` or model registrations):
     ```bash
     .venv/bin/python -c "from brightstep.db.models import *; print('imports OK')"
     ```
   - **Self-healing loop (max 3 iterations)**: If any test failure was introduced by your changes:

     1. Read the failure traceback
     2. Fix the root cause (in your code, not by deleting or weakening the test)
     3. Re-run only the failing test(s)
     4. If still failing after 3 fix attempts:
        - **Diagnose the root cause**: Is this a simple bug (typo, logic error, import issue)? Or does it hint at architectural complexity beyond your current model tier?
        - **If simple bug**: Continue fixing and document as `## Blocked` in task file, trigger Pivot Protocol
        - **If architectural complexity AND you're on Haiku**: This is a **Model Insufficiency Pause**. Do NOT continue struggling. Instead:
          1. **Move task back to backlog**: `mv plan/Doing/NNN-name.md plan/Backlog/NNN-name.md`
          2. **Create `plan/PAUSE_MODEL.md`** (see below)
          3. **Report to user**: "Task #NNN requires Opus-level architectural expertise. Pausing — please switch to Opus and resume with `/nextstep`"
          4. **Exit immediately** — do not attempt further fixes with Haiku
   - **TypeScript frontend tasks**: `cd apps/student && npx playwright test --project=anonymous --reporter=list` (if Playwright tests exist and frontend is running)
   - **No tests to run**: If the task is documentation-only or config-only with no testable code, skip the test gate (note "No tests applicable" in the acceptance criteria)
   - **NEVER run**: `.venv/bin/python -m pytest tests/` (full suite). This takes 5-10+ minutes and blocks progress. Only the `/test-all` skill or `--final-test` flag on the autorunner should trigger full suite runs.

7. **Write a reference doc** (if the task set up infrastructure or a new service): create `plan/references/NNN-short-name.md` with configuration, connection details, useful commands, and troubleshooting. Update the tech stack table in this file to link to it.
8. **Update the runbook** (`docs/runbook.md`) if the task changes operational procedures — new services, new CLI commands, new ports, new Docker containers, new troubleshooting scenarios, or changes to startup/monitoring workflows. Keep the runbook in sync with reality.
9. **Check the boxes** in the task file (change `- [ ]` to `- [x]` with a brief note)
10. **Move** the task file to the feature's completed directory:
    - Check the task's `feature:` field in YAML frontmatter
    - `mv plan/Doing/NNN-name.md features/completed/<feature>/NNN-name.md`
    - Create the directory if it doesn't exist: `mkdir -p features/completed/<feature>/`
11. **Update `features/roadmap.md`** if this was the last task for a feature — mark the feature as `[x]` complete.

### Pivot Protocol (Emergency Stop)

During task execution, if you discover that continuing is wrong or wasteful, trigger a pivot. This is an **emergency stop** for the automated task loop (`autonextstep.py`).

**When to pivot:**
- A fundamental blocker is discovered (missing infrastructure, wrong architecture, broken dependency)
- The task or feature plan is based on incorrect assumptions that invalidate multiple downstream tasks
- You need human input on a strategic decision before more tasks run
- A dependency chain is broken and multiple downstream tasks will fail
- **Opus credits exhausted**: An Opus-tier task is next but Opus is unavailable (rate-limited, credits depleted, model unavailable). Do NOT downgrade to a lesser model — pause and wait for Opus to be available again.

**When NOT to pivot:**
- A single task is hard or failing — just report the failure and let the runner continue
- You need to install a package or fix a test — that's normal work
- The task takes longer than expected — keep going

**How to pivot:**

1. **Create `plan/PIVOT.md`** with the reason:

```markdown
# Pivot — <short title>

**Triggered by**: Task #NNN — <task title>
**Date**: <today>

## Reason

<2-5 sentences explaining why continuing is wrong or wasteful>

## Affected Tasks

<List the backlog tasks that are affected and why>

## Recommended Next Steps

<What the human should do: re-plan, fix infrastructure, make a decision, etc.>
```

2. **Pause remaining backlog tasks** by renaming them with a `pause_` prefix:

```bash
cd /home/noelcacnio/Documents/repo/brightstepai/brightstepai
for f in plan/Backlog/[0-9]*.md; do
  mv "$f" "plan/Backlog/pause_$(basename "$f")"
done
```

3. **Report** what happened and why. The `autonextstep.py` runner will detect `plan/PIVOT.md` and stop the loop automatically.

**To resume after a pivot** (human runs this after addressing the issue):
```bash
python scripts/autonextstep.py --unpause   # Remove pause_ prefix + delete PIVOT.md
```

### Model Insufficiency Pause

**When a Haiku task encounters architectural complexity that requires Opus**, pause immediately instead of wasting tokens on failed attempts.

**How to trigger a Model Insufficiency Pause:**

1. **Recognize the symptom**: During implementation or test gate, you encounter a problem where:
   - Test failures hint at architectural design issues (not simple bugs)
   - The fix requires expert judgment on design patterns, API architecture, or algorithm selection
   - 3+ fix attempts still fail because the underlying design is wrong, not the implementation
   - You feel like you're guessing rather than systematically solving

2. **Pause the task**:
   ```bash
   # Move task back to backlog
   mv plan/Doing/NNN-name.md plan/Backlog/NNN-name.md
   ```

3. **Create `plan/PAUSE_MODEL.md`**:
   ```markdown
   # Model Insufficiency Pause

   **Triggered by**: Task #NNN — <task title>
   **Current model**: Haiku
   **Required model**: Opus
   **Date**: <today>

   ## Problem

   <2-3 sentences: what architectural issue was encountered that Haiku cannot solve>

   ## Example

   <Show the specific test failure or implementation blocker>

   ## Recommended Action

   Switch to Opus and run `/nextstep` to resume task #NNN.
   ```

4. **Report**:
   ```
   Task #NNN paused — requires Opus-level architecture expertise.
   Reason: [brief explanation]
   File: plan/PAUSE_MODEL.md
   Next step: Switch to Opus and run `/nextstep` to resume.
   ```

5. **To resume** (user switches to Opus, then):
   ```bash
   /nextstep   # Will automatically pick up task #NNN from backlog
   # Delete plan/PAUSE_MODEL.md after resuming
   ```

**Key principle**: Haiku is for routine work (migrations, config, CLI, tests, docs). If Haiku encounters novel architecture, algorithm design, or systems thinking, **pause and escalate to Opus immediately.** Wasting 10 failed Haiku attempts is more expensive than one Opus attempt that gets it right.

### Step 5: Write Learnings to `plan/Learnings/`

Before reporting, check if you encountered anything worth recording:
- A non-obvious fix or workaround you had to discover
- A pattern that worked well (or didn't)
- A gotcha with a library, tool, or framework
- A testing strategy that solved a tricky problem

If so, **create a new file in `plan/Learnings/`**. Find the next available number:

```bash
ls plan/Learnings/L*.md | tail -1   # Find the latest number
```

Then create the file using this format:


```bash
cat > plan/Learnings/L{NN}-task{NNN}-{short-kebab-title}.md << 'LEARNING'
# L{NN}: Short title (Task NNN)

**Problem**: What went wrong or was non-obvious

**Solution**: What fixed it

**Apply when**: When future tasks should use this knowledge

**Tags**: comma, separated, keywords
LEARNING
```

**Rules:**
- One file per learning (not one per task — skip if nothing was learned)
- Keep each file to 5-15 lines — concise and scannable
- Include **Tags** so future sessions can quickly assess relevance
- Never delete existing learning files, only add new ones
- The `plan/Learnings/` directory is the **single source of truth** for all learnings (L25+)
- Legacy learnings L01-L24 remain in the Lessons Learned section below for backward compatibility

### Step 6: Report and Stop (ONE TASK PER INVOCATION)

**CRITICAL: `/nextstep` executes exactly ONE task per invocation, then STOPS.**
Do NOT chain multiple tasks. Do NOT "go back to Step 3" after completing a task.
Each `/nextstep` invocation is a single task lifecycle: pick → execute → report → done.

After completing the task, report:
- What was done
- Files created/modified
- Verification results
- What the next task would be (for the user's information only)

Then **stop**. The user will invoke `/nextstep` again if they want the next task.
This ensures each task gets the correct model tier and a clean context window.

---

## Project Context (for fresh sessions)

**Project**: BrightStep.AI — IKIGAI-based college course matching platform

**Status**:
- Phase 0 (MVP Zero) — ✓ COMPLETE
  - MVP Zero IKIGAI College Course Finder (tasks 001-040) ✓
  - Observability with Agent Framework OpenTelemetry (tasks 041-048) ✓
- Phase 1 — IN PROGRESS
  - Admin Dashboard (tasks 049-061) — Next.js 15 + CopilotKit + FastAPI

**Full plan**: `plan/README.md` → `plan/15-mvp-zero-ikigai.md`
**Current feature**: `features/planned/explorer-hardening/README.md` (tasks 097-105 in `plan/Backlog/`)
**Architecture**: `plan/03-ddd-architecture.md` (15 bounded contexts)

### Tech Stack (Phase 0)

| Component | Technology | Details |
|-----------|-----------|---------|
| Language | Python 3.12+ | `src/brightstep/` package |
| Agent Framework | Microsoft Agent Framework | `pip install agent-framework` |
| LLM Serving | TensorRT-LLM (Docker) | See `plan/references/tensorrt-llm-setup.md` |
| Current LLM | `nvidia/Qwen3-14B-NVFP4` | Port 8000, host networking, container `trtllm_server` |
| Database | PostgreSQL 16 + pgvector | Docker: `brightstep_postgres`, port 5432 |
| Task Queue | Redis 7 (Docker, in `docker-compose.yml`) | See `plan/references/redis-setup.md` |
| Embeddings | BGE-large-en-v1.5 | Docker: `brightstep_embedding`, port 8001 |
| CLI | Typer | `src/brightstep/cli/main.py` |
| Testing | pytest + pytest-asyncio | |
| Matching Algorithm | Modulated IKIGAI scoring | See `plan/references/037-matching-algorithm.md` |
| Observability | Agent Framework built-in OTEL + Aspire Dashboard | See `plan/references/aspire-dashboard.md` |
| OTLP Backend | Aspire Dashboard (Docker) | Port 18888 (UI), port 4317 (OTLP gRPC) |

### Key Paths

```
/home/noelcacnio/Documents/repo/brightstepai/brightstepai/   # git repo root
├── plan/
│   ├── README.md                    # strategic plan entry point
│   ├── 15-mvp-zero-ikigai.md       # MVP Zero full spec
│   ├── references/                  # infrastructure & setup reference docs
│   ├── Backlog/                     # pending tasks
│   ├── Doing/                       # in-progress tasks
│   └── DECISION_LOG.md             # update on any arch/tech decisions
├── features/
│   ├── completed/
│   │   ├── mvp-zero-ikigai/        # completed MVP Zero tasks (001-040) ✓
│   │   ├── observability/           # completed observability tasks (041-048) ✓
│   │   ├── admin-dashboard/         # completed admin dashboard tasks (049-061) ✓
│   │   ├── knowledge-graph-explorer/ # completed KG explorer tasks (063-096) ✓
│   │   ├── ikigai-enrichment-pipeline/ # completed enrichment tasks (106-118) ✓
│   │   └── groq-batch-enrichment/   # completed Groq batch tasks (145-158) ✓
│   └── planned/
│       ├── observability/           # observability plan ✓ IMPLEMENTED
│       ├── admin-dashboard/         # admin dashboard plan (Phase 1+) ✓ IMPLEMENTED
│       ├── knowledge-graph-explorer/ # KG explorer plan ✓ IMPLEMENTED
│       ├── ikigai-enrichment-pipeline/ # enrichment pipeline plan ✓ IMPLEMENTED
│       ├── groq-batch-enrichment/   # Groq batch enrichment plan ✓ IMPLEMENTED
│       ├── explorer-hardening/      # explorer hardening plan (tasks 097-105)
│       └── scholarship-data-expansion/ # scholarship expansion plan (tasks 159-172)
├── infrastructure/
│   ├── docker-compose.yml           # PostgreSQL + Redis + Embedding + Aspire containers
│   └── init-db.sql                  # DB init (extensions)
├── src/brightstep/                  # application source code
├── tests/                           # pytest test suite
├── docs/runbook.md                  # operational runbook (setup, monitoring, troubleshooting)
├── .env                             # local env vars (gitignored)
├── .env.example                     # env var template
└── .gitignore
```

### Connection Details

```
DATABASE_URL=postgresql://brightstep:brightstep_dev@localhost:5432/brightstep
REDIS_URL=redis://localhost:6379/0
LLM_BASE_URL=http://localhost:8000/v1
LLM_MODEL=nvidia/Qwen3-14B-NVFP4
LLM_API_KEY=not-needed
EMBEDDING_BASE_URL=http://localhost:8001/v1
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
ENABLE_INSTRUMENTATION=true  # Optional: enable observability
```

### Mandatory Rules

- **Update `plan/DECISION_LOG.md`** when making any architectural/tech decision
- **Never hardcode** connection strings — always use `.env`
- **`.env` is gitignored** — credentials go there, templates go in `.env.example`
- **Docker-first for infrastructure**: When a task involves installing or setting up a service (database, cache, queue, etc.), always use Docker via `infrastructure/docker-compose.yml` — never install directly on the host.
- **Document setup in `plan/references/`**: When completing an infrastructure or setup task, create or update a reference file in `plan/references/`.
- **Feature plan alignment**: Check `features/planned/<feature>/README.md` for the high-level plan before implementing. If the task contradicts the plan, update both to be consistent.
- **Update `docs/runbook.md`** when adding new services, CLI commands, ports, Docker containers, or operational procedures
- **Update `.claude/commands/nextstep.md`** when making any status changes (move from PLANNED to IMPLEMENTED, complete features, update phase, etc.)

---

## Completed Features

### ✓ Feature: MVP Zero IKIGAI (tasks 001–040) — COMPLETE

| Week | IDs | Focus |
|------|-----|-------|
| 1 | 001–009 | Infrastructure: PostgreSQL, Redis, Python scaffold, Agent Framework, TRT-LLM, embeddings |
| 2 | 010–014 | Core: KG schema, Redis queue, Orchestrator Agent, KG Builder Agent, embedding pipeline |
| 2–3 | 015–019 | University research: IPEDS, College Scorecard, web scraper, University Research Agent |
| 4 | 020–025 | Career + scholarship: BLS, O*NET, Career Agent, scholarship scraper, legitimacy scoring |
| 5 | 026–030 | Analysis + quality: Program Analysis Agent, strength rating, Quality Agent, confidence |
| 6 | 031–035 | IKIGAI + CLI: profile model, Matching Agent, vector matching, Typer CLI |
| 7 | 036–038 | Validation: full 5,300 institution run, test profiles, weight tuning |
| 8 | 039–040 | Audit: data quality report, gap filling, documentation |

**Completed tasks archived at**: `features/completed/mvp-zero-ikigai/`

### ✓ Feature: Observability (tasks 041–048) — COMPLETE

| # | Task | Model | Status |
|---|------|-------|--------|
| 041 | Enable OTEL env vars + `configure_otel_providers()` | Haiku | ✓ |
| 042 | Add Aspire Dashboard to docker-compose.yml | Haiku | ✓ |
| 043 | Verify end-to-end agent tracing | Haiku | ✓ |
| 044 | OrchestratorAgent custom spans | Opus | ✓ |
| 045 | Redis TaskQueue custom spans | Haiku | ✓ |
| 046 | Custom tool spans (embedding, matcher, etc.) | Opus | ✓ |
| 047 | SQLAlchemy DB query tracing | Haiku | ✓ |
| 048 | Reference doc + full verification | Haiku | ✓ |

**Implementation details**: `features/completed/observability/README.md`
**Aspire Dashboard guide**: `plan/references/aspire-dashboard.md`
**Completed tasks archived at**: `features/completed/observability/`

### ✓ Feature: Admin Dashboard (tasks 049–061) — COMPLETE

| # | Task | Model | Status |
|---|------|-------|--------|
| 049 | Scaffold Next.js 15 app with Tailwind + shadcn/ui | Haiku | ✓ |
| 050 | Install CopilotKit + AG-UI client packages | Haiku | ✓ |
| 051 | Create FastAPI stats.py — DB + Redis queries | Haiku | ✓ |
| 052 | Create FastAPI dashboard app — JSON API + SSE | Opus | ✓ |
| 053 | Add agent-framework-ag-ui endpoint to FastAPI | Opus | ✓ |
| 054 | Add Redis pub/sub events to TaskQueue | Haiku | ✓ |
| 055 | Build stats-provider.tsx — SSE React hook | Opus | ✓ |
| 056 | Build Knowledge Graph panel (cards + sparklines) | Haiku | ✓ |
| 057 | Build Vector Coverage panel (progress + bar chart) | Haiku | ✓ |
| 058 | Build Data Quality panel (pie chart + badges) | Haiku | ✓ |
| 059 | Build Agent Activity panel (area chart + tables) | Haiku | ✓ |
| 060 | Wire CopilotKit sidebar with AG-UI agent | Opus | ✓ |
| 061 | Add `brightstep dashboard` CLI command | Haiku | ✓ |

**Feature plan**: `features/planned/admin-dashboard/README.md`
**Completed tasks archived at**: `features/completed/admin-dashboard/`

### ✓ Task 062 — Scholarship Pagination & Sources — COMPLETE

| # | Task | Model | Status |
|---|------|-------|--------|
| 062 | Add pagination + additional sources to scholarship scraper | Opus | ✓ |

**Completed task archived at**: `features/completed/mvp-zero-ikigai/062-Opus-scholarship-pagination-and-sources.md`

### ✓ Feature: Knowledge Graph Explorer (tasks 063–096) — COMPLETE

| # | Task | Model | Status |
|---|------|-------|--------|
| 063 | Install RAPIDS (cuGraph + cuML) in Docker on DGX Spark | Haiku | ✓ |
| 064 | Create `src/brightstep/explorer/` Python package scaffold | Haiku | ✓ |
| 065 | Build `graph_builder.py` — Load KG into cuGraph + synthetic scholarship edges | Opus | ✓ |
| 066 | Build `layout_service.py` — GPU ForceAtlas2 + Redis caching | Opus | ✓ |
| 067 | Build `umap_service.py` — GPU UMAP projection + Redis caching | Opus | ✓ |
| 068 | Build `community_service.py` (Louvain + CIP labels) + `pagerank_service.py` | Opus | ✓ |
| 069 | Build FastAPI `app.py` + routes + daily recompute scheduler | Haiku | ✓ |
| 070 | Build Pydantic response models + node detail queries (5 entity types) | Haiku | ✓ |
| 071 | Add Redis cache layer + `/api/graph/recompute` manual trigger | Haiku | ✓ |
| 072 | Scaffold Next.js 15 app in `apps/explorer/` (port 3200) | Haiku | ✓ |
| 073 | Build `graph-canvas.tsx` — HTML Canvas 2D renderer | Opus | ✓ |
| 074 | Build `graph-controls.tsx` — Search, filter, view toggle | Haiku | ✓ |
| 075 | Build `detail-sidebar.tsx` + entity detail views (5 types) | Opus | ✓ |
| 076 | Build `ikigai-radar.tsx` — Recharts radar chart | Haiku | ✓ |
| 077 | Build `umap-canvas.tsx` — UMAP embedding space view | Opus | ✓ |
| 078 | Build `graph-legend.tsx` + `graph-minimap.tsx` | Haiku | ✓ |
| 079 | Wire search + filters to FastAPI endpoints | Haiku | ✓ |
| 080 | Add `brightstep explorer` CLI command | Haiku | ✓ |
| 081 | Build `ikigai-form.tsx` — Session-based IKIGAI input + UMAP overlay | Opus | ✓ |
| 082 | Add `compute_graph_layout.py` standalone script | Haiku | ✓ |
| 083 | Write tests for FastAPI endpoints | Haiku | ✓ |
| 084 | Write tests for cuGraph/cuML services (mock GPU) | Haiku | ✓ |
| 085 | Write tests for synthetic scholarship edge builder | Opus | ✓ |
| 086 | Integration test: full pipeline — DB → cuGraph → cache → API → render | Opus | ✓ |
| 087 | Add `Dockerfile.explorer` + docker-compose service | Haiku | ✓ |
| 088 | Add Next.js API proxy route (CORS avoidance) | Haiku | ✓ |
| 089 | Build `filter_service.py` — LLM filter extraction via TRT-LLM | Opus | ✓ |
| 090 | Build FastAPI `chat_filter.py` route | Haiku | ✓ |
| 091 | Build `chat-panel.tsx` + `chat-input.tsx` — Chat sidebar | Opus | ✓ |
| 092 | Build `filter-reason-card.tsx` — Explanation cards | Opus | ✓ |
| 093 | Build `use-chat-filter.ts` + `use-filter-history.ts` — Debounce + undo + sync | Opus | ✓ |
| 094 | Build graph animation for filter transitions | Haiku | ✓ |
| 095 | Write tests for `filter_service.py` | Haiku | ✓ |
| 096 | Integration test: chat → LLM → filter → graph → explanation | Opus | ✓ |

**Feature plan**: `features/planned/knowledge-graph-explorer/README.md`
**Completed tasks archived at**: `features/completed/knowledge-graph-explorer/`

### ✓ Feature: IKIGAI Enrichment Pipeline (tasks 106–118) — COMPLETE

| # | Task | Model | Status |
|---|------|-------|--------|
| 106 | Create enrichment module scaffold + config | Haiku | ✓ |
| 107 | Build CIP taxonomy mapping (2-digit CIP → base IKIGAI scores) | Haiku | ✓ |
| 108 | Implement Phase A: Bulk career mapper with delta mode | Opus | ✓ |
| 109 | Implement Phase B: Rule-based IKIGAI scorer with configurable weights | Opus | ✓ |
| 110 | Implement Phase C: LLM enrichment with batch prompting | Opus | ✓ |
| 111 | Build enrichment runner (orchestrates A→B→C, progress reporting) | Haiku | ✓ |
| 112 | Add CLI commands (`brightstep enrich`) | Haiku | ✓ |
| 113 | Write tests for career mapper (Phase A) | Haiku | ✓ |
| 114 | Write tests for IKIGAI scorer (Phase B) | Haiku | ✓ |
| 115 | Write tests for LLM enricher (Phase C) | Haiku | ✓ |
| 116 | Write tests for enrichment runner + config | Haiku | ✓ |
| 117 | Run full enrichment pipeline end-to-end, validate matching improvement | Opus | ✓ |
| 118 | Update documentation (plan, DECISION_LOG, CLAUDE.md references) | Haiku | ✓ |

**Feature plan**: `features/planned/ikigai-enrichment-pipeline/README.md`
**Completed tasks archived at**: `features/completed/ikigai-enrichment-pipeline/`

### ✓ Feature: Groq Batch Enrichment (tasks 145–158) — COMPLETE

| # | Task | Model | Status |
|---|------|-------|--------|
| 145 | Add `groq` dependency + Groq batch config fields to `config.py` | Haiku | ✓ |
| 146 | Implement `GroqBatchClient` — file upload, batch create, poll, download results | Opus | ✓ |
| 147 | Write prompt templates for all 4 entity types (`groq_prompts.py`) | Opus | ✓ |
| 148 | Implement `GroqBatchOrchestrator` — query entities, build JSONL, split files, submit | Opus | ✓ |
| 149 | Implement `GroqIngestor` — parse result JSONL + bulk upsert per entity type | Opus | ✓ |
| 150 | Add CLI subcommand group (`brightstep enrich groq submit/ingest/status`) | Haiku | ✓ |
| 151 | Wire into `EnrichmentRunner` — `run_groq_submit()` and `run_groq_ingest()` | Haiku | ✓ |
| 152 | Write tests for `GroqBatchClient` (mock groq SDK) | Haiku | ✓ |
| 153 | Write tests for prompt templates (validate structure, token estimates) | Haiku | ✓ |
| 154 | Write tests for `GroqIngestor` (parse mock JSONL responses, validate DB upserts) | Haiku | ✓ |
| 155 | Write tests for `GroqBatchOrchestrator` (JSONL build + split logic) | Haiku | ✓ |
| 156 | Run test batch (100 programs) end-to-end, validate quality | Opus | ✓ |
| 157 | Run full enrichment batch (all entities), validate coverage + cost | Opus | ✓ |
| 158 | Update documentation (DECISION_LOG, plan references, CLI docs, MEMORY.md) | Haiku | ✓ |

**Feature plan**: `features/planned/groq-batch-enrichment/README.md`
**Completed tasks archived at**: `features/completed/groq-batch-enrichment/`

### Feature: Explorer Hardening (tasks 097–105) — IN PROGRESS

| # | Task | Model | Status |
|---|------|-------|--------|
| 097 | Fix UMAP projection route: `project_embedding` → `project_point`, remove dead code | Haiku | Pending |
| 098 | Add recompute status tracking + `/recompute/status` endpoint | Haiku | Pending |
| 099 | Handle UMAP model pickle GPU/CPU incompatibility | Haiku | Pending |
| 100 | Add CPU fallback deps to `pyproject.toml` explorer extras | Haiku | Pending |
| 101 | Upgrade health endpoint to check DB + Redis connectivity | Haiku | Pending |
| 102 | Round JSON float precision in layout + UMAP output | Haiku | Pending |
| 103 | Write CPU fallback path tests | Haiku | Pending |
| 104 | Verify UMAP recompute end-to-end with fixed column names | Haiku | Pending |
| 105 | Update runbook with CPU fallback docs and troubleshooting | Haiku | Pending |

**Feature plan**: `features/planned/explorer-hardening/README.md`
**Tasks in backlog**: `plan/Backlog/097-*.md` through `plan/Backlog/105-*.md`

### ✓ Feature: Scholarship Data Expansion (tasks 159–172) — COMPLETE

| # | Task | Model | Status |
|---|------|-------|--------|
| 159 | Build CareerOneStop API client (`tools/apis/careeronestop.py`) | Opus | ✓ |
| 160 | Build Grants.gov API client (`tools/apis/grants_gov.py`) | Opus | ✓ |
| 161 | Integrate API clients into `ScholarshipResearchAgent` | Haiku | ✓ |
| 162 | Add Playwright source classification to `ScholarshipScraper` | Haiku | ✓ |
| 163 | Build university financial aid page scraper (`tools/university_fa_scraper.py`) | Opus | ✓ |
| 164 | Integrate university FA scraper into `ScholarshipResearchAgent` | Haiku | ✓ |
| 165 | Build NY HESC CSV importer (`enrichment/scholarship_csv_import.py`) | Haiku | ✓ |
| 166 | Add `brightstep scholarships` CLI commands (import, scrape, status) | Haiku | ✓ |
| 167 | Write tests for CareerOneStop API client | Haiku | ✓ |
| 168 | Write tests for Grants.gov API client | Haiku | ✓ |
| 169 | Write tests for university FA scraper | Haiku | ✓ |
| 170 | Write tests for CSV importer | Haiku | ✓ |
| 171 | Run full scholarship expansion pipeline end-to-end | Opus | ✓ |
| 172 | Update documentation (plan, DECISION_LOG, runbook, cli-usage) | Haiku | ✓ |

**Feature plan**: `features/planned/scholarship-data-expansion/README.md`
**Completed tasks archived at**: `features/completed/scholarship-data-expansion/`

### Feature: Scholarship Scraper Expansion (tasks 173–190) — IN PROGRESS

| # | Task | Model | Status |
|---|------|-------|--------|
| 173 | Design and build Peterson's API client | Opus | Pending |
| 174 | Build Scholarships360 custom extractor | Haiku | Pending |
| 175 | Improve generic extractor (card + schema.org + table detection) | Opus | Pending |
| 176 | Build Niche.com custom extractor (Playwright + React) | Haiku | Pending |
| 177 | Build Chegg custom extractor | Haiku | Pending |
| 178 | Build Bold.org custom extractor (Playwright + Cloudflare) | Haiku | Pending |
| 179 | Fix CareerOneStop log-once spam | Haiku | Pending |
| 180 | Integrate Peterson's client into ScholarshipResearchAgent | Haiku | Pending |
| 181 | Extract site-specific modules into scholarship_scraper_sites/ | Haiku | Pending |
| 182 | Register new extractors in _SITE_EXTRACTORS + update JS_HEAVY_SOURCES | Haiku | Pending |
| 183 | Tests for Peterson's client | Haiku | Pending |
| 184 | Tests for Scholarships360 extractor | Haiku | Pending |
| 185 | Tests for Niche.com extractor | Haiku | Pending |
| 186 | Tests for Chegg extractor | Haiku | Pending |
| 187 | Tests for Bold.org extractor | Haiku | Pending |
| 188 | Tests for improved generic extractor | Haiku | Pending |
| 189 | End-to-end verification: run full scrape and report counts | Haiku | Pending |
| 190 | Update documentation | Haiku | Pending |

**Feature plan**: `features/planned/scholarship-scraper-expansion/README.md`
**Tasks in backlog**: `plan/Backlog/173-*.md` through `plan/Backlog/190-*.md`

### Feature: LLM Comparison Demo (tasks 281–292) — IN PROGRESS

| # | Task | Model | Status |
|---|------|-------|--------|
| 281 | Create vanilla LLM streaming client | Haiku | Pending |
| 282 | Build dual-panel Gradio layout | Opus | Pending |
| 283 | Implement synchronized message dispatch | Opus | Pending |
| 284 | Add LLM provider dropdown with dynamic filtering | Haiku | Pending |
| 285 | Build comparison scorecard (heuristic metrics) | Opus | Pending |
| 286 | Import and wire progress tracking from existing app | Haiku | Pending |
| 287 | Add Claude API support (non-OpenAI format) | Haiku | Pending |
| 288 | Write unit tests for comparison logic | Haiku | Pending |
| 289 | Add "Reset Both" button and polish UI | Haiku | Pending |
| 290 | Create HF Spaces deployment config (huggingface-comparison/) | Haiku | Pending |
| 291 | Update .env.example with new keys | Haiku | Pending |
| 292 | End-to-end manual test + polish | Haiku | Pending |

**Feature plan**: `features/planned/llm-comparison-demo/README.md`
**Tasks in backlog**: `plan/Backlog/281-*.md` through `plan/Backlog/292-*.md`

### ✓ Feature: Clerk Init (tasks 304–307) — COMPLETE

| # | Task | Model | Status |
|---|------|-------|--------|
| 304 | Install Playwright + @clerk/testing in student app | Haiku | ✓ |
| 305 | Playwright smoke tests for auth pages + public routes | Haiku | ✓ |
| 306 | Verify middleware configuration — all routes public | Haiku | ✓ |
| 307 | Update docs (runbook, env, nextstep) | Haiku | ✓ |

**Feature plan**: `features/planned/clerk-init/README.md`
**Completed tasks**: `features/completed/clerk-init/304-*.md` through `features/completed/clerk-init/307-*.md`

### Feature: IKIGAI Matching v2 (tasks 361–409) — IN PROGRESS

| # | Task | Model | Status |
|---|------|-------|--------|
| 361 | Design triplet generation strategy | Opus | Pending |
| 362 | Implement triplet generator | Sonnet | Pending |
| 363 | Research Qwen3-Embedding SWIFT fine-tuning | Opus | Pending |
| 364 | Implement embedding trainer (SWIFT LoRA) | Opus | Pending |
| 365 | Run embedding training (3 epochs) | Sonnet | Pending |
| 366 | Create vector dimension migration (1024→4096) | Haiku | Pending |
| 367 | Update EmbeddingPipeline — configurable dims + instruction | Haiku | Pending |
| 368 | Implement embedding migrator (re-embed all entities) | Sonnet | Pending |
| 369 | Run schema + embedding migration | Haiku | Pending |
| 370 | Add embedding config settings | Haiku | Pending |
| 371 | Run validation — fine-tune vs baseline (Phase A) | Opus | Pending |
| 372 | Write tests — triplet generator + embedding pipeline | Haiku | Pending |
| 373 | Implement schema migrator (safe migration wrapper) | Sonnet | Pending |
| 374 | Update docs — embedding fine-tuning | Haiku | Pending |
| 375 | Create graph_communities migration | Haiku | Pending |
| 376 | Implement graph indexer — PostgreSQL→cuGraph export | Opus | Pending |
| 377 | Add Leiden community detection (GPU) | Opus | Pending |
| 378 | Generate community summaries (Groq batch LLM) | Sonnet | Pending |
| 379 | Embed community summaries | Haiku | Pending |
| 380 | Implement graph retriever — multi-hop recursive CTEs | Opus | Pending |
| 381 | Integrate graph retriever into IKIGAIMatchingAgent | Opus | Pending |
| 382 | Run validation — GraphRAG vs Phase A (Phase B) | Opus | Pending |
| 383 | Add graph config settings | Haiku | Pending |
| 384 | Write tests — graph indexer + retriever | Haiku | Pending |
| 385 | Add graph CLI commands | Haiku | Pending |
| 386 | Update docs — GraphRAG | Haiku | Pending |
| 387 | Create user_interactions migration | Haiku | Pending |
| 388 | Create user_consents migration | Haiku | Pending |
| 389 | Implement consent manager | Opus | Pending |
| 390 | Implement feedback collector | Opus | Pending |
| 391 | Add feedback + consent API endpoints | Haiku | Pending |
| 392 | Build SignupPrompt component | Opus | Pending |
| 393 | Build ConsentForm component | Opus | Pending |
| 394 | Add feedback event emission (click/dwell/save) | Haiku | Pending |
| 395 | Implement feature engineer (ranking features) | Opus | Pending |
| 396 | Implement ranker trainer (XGBoost LambdaMART) | Sonnet | Pending |
| 397 | Implement ranker inference | Haiku | Pending |
| 398 | Integrate ranker into matching agent | Sonnet | Pending |
| 399 | Add matching CLI commands (train-ranker, feedback-stats) | Haiku | Pending |
| 400 | Design DPO training data pipeline | Sonnet | Pending |
| 401 | Implement DPO trainer (QLoRA) | Opus | Pending |
| 402 | Integrate DPO model into matching | Sonnet | Pending |
| 403 | Implement ComplianceResearchAgent | Opus | Pending |
| 404 | Add legal monitoring tools | Sonnet | Pending |
| 405 | Implement compliance alert pipeline | Sonnet | Pending |
| 406 | Add compliance scheduling + CLI | Haiku | Pending |
| 407 | Run validation — full V2 pipeline (Phase C) | Opus | Pending |
| 408 | Write tests — consent, feedback, ranker | Haiku | Pending |
| 409 | Update docs — learning-to-rank + compliance | Haiku | Pending |

**Feature plan**: `features/planned/ikigai-matching-v2/README.md`
**Tasks in backlog**: `plan/Backlog/361-*.md` through `plan/Backlog/409-*.md`

### Feature: Program Description Enrichment (tasks 410–427) — IN PROGRESS

| # | Task | Model | Status |
|---|------|-------|--------|
| 410 | Create migration 013 (cip_descriptions, data_source_downloads, scraped_program_pages + programs columns) | Haiku | Pending |
| 411 | Build CIP taxonomy parser (download + parse NCES CSV) | Haiku | Pending |
| 412 | Ingest CIP descriptions into programs (bulk UPDATE) | Haiku | Pending |
| 413 | Download Scorecard Field-of-Study CSV + parse outcomes | Haiku | Pending |
| 414 | Merge Scorecard outcomes into programs (median_salary, median_debt) | Haiku | Pending |
| 415 | Build program catalog scraper (Playwright + httpx) | Opus | Pending |
| 416 | Scrape top-tier universities (execute scraping run) | Haiku | Pending |
| 417 | Match scraped descriptions to programs (fuzzy name matching) | Sonnet | Pending |
| 418 | Build Groq description generator (prompt + JSONL) | Opus | Pending |
| 419 | Submit + ingest LLM-generated descriptions | Haiku | Pending |
| 420 | Add description enrichment CLI commands | Haiku | Pending |
| 421 | Configure PEFT model loading (LoRA adapter serving) | Opus | Pending |
| 422 | Deploy fine-tuned model on embedding server | Haiku | Pending |
| 423 | Re-embed all programs with populated descriptions | Haiku | Pending |
| 424 | Run Phase C re-validation (100-profile test suite) | Opus | Pending |
| 425 | Write tests for all enrichment modules | Haiku | Pending |
| 426 | Build production deploy command (UPSERT to Supabase) | Opus | Pending |
| 427 | Update docs (runbook, schema, env, roadmap) | Haiku | Pending |

**Feature plan**: `features/planned/program-description-enrichment/README.md`
**Tasks in backlog**: `plan/Backlog/410-*.md` through `plan/Backlog/427-*.md`

### Feature: IKIGAI v2 Production Deployment (tasks 428–441) — IN PROGRESS

| # | Task | Model | Status |
|---|------|-------|--------|
| 428 | Build LoRA merge + HF Hub upload script | Opus | Pending |
| 429 | Create HF Inference Endpoint (TEI, always-on, private) | Haiku | Pending |
| 430 | Verify EmbeddingPipeline works with HF TEI endpoint format | Sonnet | Pending |
| 431 | Build migration deployer module | Opus | Pending |
| 432 | Apply migrations 008-013 to Supabase production | Haiku | Pending |
| 433 | Build embedding deployer (re-embed on production) | Opus | Pending |
| 434 | Deploy enrichment data to production | Haiku | Pending |
| 435 | Re-embed all 118K entities on production via HF Endpoint | Sonnet | Pending |
| 436 | Update Railway env vars | Haiku | Pending |
| 437 | Update deploy-prod skill | Sonnet | Pending |
| 438 | Add brightstep deploy CLI commands | Haiku | Pending |
| 439 | Update production docs | Haiku | Pending |
| 440 | Write tests for deployers | Haiku | Pending |
| 441 | End-to-end production smoke test | Opus | Pending |

**Feature plan**: `features/planned/ikigai-v2-deployment/README.md`
**Tasks in backlog**: `plan/Backlog/428-*.md` through `plan/Backlog/441-*.md`

### ✓ Feature: 3-Layer Guardrail Architecture (tasks 442–454) — COMPLETE

| # | Task | Model | Status |
|---|------|-------|--------|
| 442 | Create guardrails module with multi-provider async client | Sonnet | ✓ |
| 443 | Implement input guard — Prompt Guard 2 jailbreak/injection detection | Haiku | ✓ |
| 444 | Implement output guard — Llama Guard 4 content safety classification | Haiku | ✓ |
| 445 | Implement guardrail policy — refusal messages, severity mapping, Pushover triggers | Haiku | ✓ |
| 446 | Implement per-session strike counter and rate limiter | Haiku | ✓ |
| 447 | Add guardrail configuration to config.py and env templates | Haiku | ✓ |
| 448 | Integrate input guardrail + rate limiter into AG-UI endpoint | Opus | ✓ |
| 449 | Integrate output guardrail into AG-UI streaming pipeline | Opus | ✓ |
| 450 | Add guardrail to LLM Arena direct API calls | Haiku | ✓ |
| 451 | Write guardrail unit tests with mocked Groq and OpenAI responses | Haiku | ✓ |
| 452 | Write guardrail integration tests with live Groq and OpenAI APIs | Haiku | ✓ |
| 453 | Add guardrail metrics to admin dashboard | Opus | ✓ |
| 454 | Update documentation for guardrail architecture | Haiku | ✓ |

**Feature plan**: `features/planned/guardrail-architecture/README.md`
**Completed tasks archived at**: `features/completed/guardrail-architecture/`

### Feature: NeMo Guardrails Integration (tasks 477–499) — IN PROGRESS

#### V1: LLM Self-Check + Topical Rails (tasks 477–492)

| # | Task | Model | Status |
|---|------|-------|--------|
| 477 | Install nemoguardrails[openai], verify import | Haiku | Pending |
| 478 | Create NeMo config directory + config.yml | Opus | Pending |
| 479 | Write Colang topical rails (allowed/disallowed topics) | Opus | Pending |
| 480 | Write Colang policy rails (no guarantees, no PII, no advice) | Opus | Pending |
| 481 | Write custom self-check prompt templates (prompts.yml) | Opus | Pending |
| 482 | Implement nemo_actions.py (Llama Guard + regex as NeMo actions) | Haiku | Pending |
| 483 | Implement nemo_rails.py (BrightStepRails wrapper) | Opus | Pending |
| 484 | Integrate NeMo into AG-UI endpoint (input check) | Opus | Pending |
| 485 | Integrate NeMo into output pipeline (streaming) | Opus | Pending |
| 486 | Integrate NeMo into LLM Arena | Haiku | Pending |
| 487 | Add NeMo config fields to config.py + .env templates | Haiku | Pending |
| 488 | Update Dockerfile to include nemo_config/ | Haiku | Pending |
| 489 | Write NeMo unit tests | Haiku | Pending |
| 490 | Write NeMo integration tests (live gpt-4.1-mini) | Haiku | Pending |
| 491 | Manual QA — browser testing | Opus | Pending |
| 492 | Update documentation | Haiku | Pending |

#### V2: Perplexity Heuristics Sidecar (tasks 493–499)

| # | Task | Model | Status |
|---|------|-------|--------|
| 493 | Create Dockerfile.nemo-heuristics (gpt2-large) | Opus | Pending |
| 494 | Add heuristics service to docker-compose.yml | Haiku | Pending |
| 495 | Deploy heuristics to HF Inference Endpoint | Opus | Pending |
| 496 | Update NeMo config.yml for V2 heuristics | Haiku | Pending |
| 497 | Write adversarial jailbreak tests | Opus | Pending |
| 498 | Tune perplexity thresholds (100 benign + 100 adversarial) | Opus | Pending |
| 499 | Update V2 documentation | Haiku | Pending |

**Feature plan**: `features/planned/nemo-guardrails/README.md`
**Tasks in backlog**: `plan/Backlog/477-*.md` through `plan/Backlog/499-*.md`

### ✓ Feature: MOA — Mixture of Agents (tasks 500–531) — COMPLETE

| # | Task | Model | Status |
|---|------|-------|--------|
| 500 | Package structure + types | Haiku | ✓ |
| 501 | RRF aggregator | Haiku | ✓ |
| 502 | Aggregator tests | Haiku | ✓ |
| 503 | Base expert class | Sonnet | ✓ |
| 504 | System prompts for 6 experts | Opus | ✓ |
| 505 | College Life expert | Opus | ✓ |
| 506 | Wellbeing & Safety expert | Opus | ✓ |
| 507 | Financial Fit expert | Opus | ✓ |
| 508 | Academic Growth expert | Opus | ✓ |
| 509 | Career Outcomes expert | Opus | ✓ |
| 510 | Specialized Pathways expert | Opus | ✓ |
| 511 | Expert tests (23 tests) | Sonnet | ✓ |
| 512 | Migration 016: expert_evaluations | Haiku | ✓ |
| 513 | Migration 017: training data tables | Haiku | ✓ |
| 514 | Batch evaluator | Sonnet | ✓ |
| 515 | Batch evaluator tests (13 tests) | Sonnet | ✓ |
| 516 | MOA orchestrator | Sonnet | ✓ |
| 517 | Weight inference | Sonnet | ✓ |
| 518 | Weight inference tests | Sonnet | ✓ |
| 519 | Orchestrator tests (14 tests) | Sonnet | ✓ |
| 520 | Config settings (8 env vars) | Haiku | ✓ |
| 521 | Integrate into IKIGAIMatchingAgent | Sonnet | ✓ |
| 522 | Integration tests (8 tests) | Sonnet | ✓ |
| 523 | Expert reasoning → match cards | Sonnet | ✓ |
| 524 | Training data collector | Sonnet | ✓ |
| 525 | Training data tests (10 tests) | Sonnet | ✓ |
| 526 | Implicit feedback tracking | Sonnet | ✓ |
| 527 | Update .env examples | Haiku | ✓ |
| 528 | A/B testing harness (17 tests) | Sonnet | ✓ |
| 529 | A/B comparison report | Opus | ✓ |
| 530 | Batch evaluation CLI | Sonnet | ✓ |
| 531 | Update tracking docs | Haiku | ✓ |

**Feature plan**: `features/planned/moa-mixture-of-agents/README.md`
**Completed tasks archived at**: `features/completed/moa-mixture-of-agents/`


---

## Lessons Learned

> **READ THIS FIRST.** Before starting any task, scan these lessons for relevant gotchas.
> After completing a task, add any new learnings here. This section is append-only — never delete entries.

### L01: SQLAlchemy asyncpg connection pool poisoning between tests (Task 013)
**Problem**: Integration tests using the global `get_session()` connection pool would pass individually but fail when run together. After each test, the cleanup fixture's teardown would encounter "cannot rollback; the transaction is in error state" because the shared connection pool retained connections from previous tests that were in a bad state.
**Solution**: Reset the global engine (`await db_conn.close()`) both before and after each test in the `autouse` cleanup fixture. This forces a fresh connection pool per test. Also use `TRUNCATE ... CASCADE` instead of ordered `DELETE FROM` statements for cleanup — it's simpler and handles FK ordering automatically.
**Apply when**: Writing any integration test that uses `brightstep.db.connection.get_session()` (the global async engine). Always reset the engine between tests.

### L02: Mocking httpx responses — use MagicMock not AsyncMock for .json() (Task 013)
**Problem**: When mocking an httpx response, using `AsyncMock()` for the response object made `.json()` return a coroutine instead of a dict, causing `response.json()["data"]` to fail with `TypeError: 'coroutine' object is not subscriptable`.
**Solution**: Use `MagicMock()` for the response object (so `.json()` returns a dict synchronously, matching httpx's actual sync `.json()` method). Use `AsyncMock()` only for the client itself (whose `.post()` is async).
**Apply when**: Mocking any HTTP client (httpx, aiohttp) in tests. The response object's `.json()` is sync — only the request methods (`.post()`, `.get()`) are async.

### L03: asyncpg `:param::type` SQL cast collision (Task 038)
**Problem**: In `ikigai_matcher.py`, the SQL query used `:vec::vector` to cast a bind parameter to pgvector type. asyncpg's SQLAlchemy dialect interprets this as two bind parameters (`:vec` and `:vector`), causing `asyncpg.PostgresSyntaxError: syntax error at or near ":"`.
**Solution**: Remove the `::vector` cast — pgvector's `<=>` operator context handles type coercion automatically. Change `:vec::vector` to just `:vec`. The matching agent's `_vector_pre_filter` (which used `:embedding` without `::vector`) never had this bug.
**Apply when**: Writing any raw SQL with pgvector + asyncpg/SQLAlchemy. Never use `::type` casts on bind parameters — asyncpg misparses the `::` as a new parameter prefix. Let pgvector operators handle type inference.

### L04: pytest-asyncio singleton event loop lifecycle (Task 038)
**Problem**: Module-level singletons (`EmbeddingPipeline._client`, `AsyncEngine`) bind async resources (httpx.AsyncClient, asyncpg connection pool) to whichever event loop first creates them. With pytest-asyncio's default per-function loop scope, the second async test gets a new loop while the singleton still holds a client from the now-closed first loop → `RuntimeError: Event loop is closed`.
**Solution**: Two-part fix: (1) Add `asyncio_default_fixture_loop_scope = "session"` to `pyproject.toml` so all async tests share one event loop. (2) Add an autouse fixture in `tests/conftest.py` that resets all module-level singletons (`_engine`, `_session_factory`, `_pipeline`) before and after each test — so stale clients never leak between tests.
**Apply when**: Any test file that imports modules with async singletons (db connection pools, HTTP clients). Always reset singletons in conftest.py and use session-scoped event loops.

### L05: OTEL TracerProvider can only be set once per process (Task 044)
**Problem**: `trace.set_tracer_provider()` logs a warning and silently ignores the call if a provider is already set. In tests, creating a fresh `TracerProvider` per test via an autouse fixture caused only the first test to collect spans — all subsequent tests got empty exporters because their `set_tracer_provider` calls were ignored.
**Solution**: Create the `TracerProvider` and `InMemoryExporter` once at module level, call `set_tracer_provider` once, then use an autouse fixture that only calls `exporter.clear()` between tests. The module-level `_tracer` in application code (created via `get_tracer()`) works as a proxy tracer that delegates to whatever global provider is installed — even if the tracer was obtained before the provider was set.
**Apply when**: Writing OTEL span tests for any `get_tracer()`-instrumented module. Use a single module-level TracerProvider, never per-test.

### L06: span.record_exception() requires an exception instance, not a class (Task 046)
**Problem**: In `except ValueError:` blocks, calling `span.record_exception(ValueError)` (the class) instead of `span.record_exception(e)` (the instance) causes `AttributeError: 'getset_descriptor' object has no attribute 'tb_frame'` because the OTEL SDK tries to call `traceback.format_exception()` on the class object, which has no traceback.
**Solution**: Always use `except ValueError as e:` and pass the instance `e` to both `span.set_status(StatusCode.ERROR, str(e))` and `span.record_exception(e)`.
**Apply when**: Adding OTEL spans with error recording. Never pass exception classes to `record_exception()`.

### L07: OTEL span tests with multiple test modules — add processor, don't replace provider (Task 046)
**Problem**: When multiple test modules each create their own `TracerProvider` and call `trace.set_tracer_provider()`, only the first one wins (per L05). Later modules' exporters never receive spans, causing assertion failures like `assert len(spans) == 1` failing with `0`.
**Solution**: At module init, check `trace.get_tracer_provider()` — if it's already a `TracerProvider` (SDK), add your processor to it with `_provider.add_span_processor(SimpleSpanProcessor(_exporter))`. Only call `trace.set_tracer_provider()` if no SDK provider exists yet.
**Apply when**: Writing OTEL span tests in new test modules that may run alongside other OTEL test modules (e.g., `test_orchestrator_spans.py`).

### L08: SSE streaming tests hang with HTTPX ASGI transport (Task 052)
**Problem**: Testing FastAPI SSE endpoints with `client.stream("GET", "/api/stream")` via HTTPX's `ASGITransport` hangs indefinitely. The `request.is_disconnected()` check never returns True because the ASGI transport doesn't send a disconnect event until the client fully closes, creating a deadlock — the client waits for data, the server waits for disconnect.
**Solution**: Test the SSE generator function (`_sse_event_generator`) directly instead of going through the HTTP client. Use `gen.__anext__()` with `asyncio.wait_for(timeout=...)` to pull individual events, then `gen.aclose()` to clean up. For the HTTP endpoint test, patch the generator with a simple one-shot mock that yields one event and returns.
**Apply when**: Testing any FastAPI SSE/streaming endpoint. Use direct generator testing for event content/format, HTTP client only for status codes, headers, and content-type.

### L09: Mock redis.pubsub() as sync, not async (Task 052)
**Problem**: `Redis.pubsub()` in redis-py is a synchronous method that returns a `PubSub` object. Using `AsyncMock()` for the mock Redis makes `redis.pubsub()` return a coroutine instead of the mock PubSub object, causing `AttributeError: 'coroutine' object has no attribute 'subscribe'`.
**Solution**: Use `MagicMock()` (not `AsyncMock()`) for the Redis instance. Set `mock_redis.pubsub.return_value = mock_pubsub`. The pubsub object's `subscribe()`, `unsubscribe()`, and `aclose()` are async, so those should be `AsyncMock()`. The `listen()` method should be an async generator function assigned directly (not as AsyncMock).
**Apply when**: Mocking Redis pub/sub in any test. Same pattern as L02 — sync methods get `MagicMock`, async methods get `AsyncMock`.

### L10: Async generator cleanup — use asyncio.gather(return_exceptions=True) (Task 052)
**Problem**: When closing an async generator via `gen.aclose()`, Python throws `GeneratorExit` into the generator. If the `finally` block uses `await task` and the task raises `CancelledError`, the exception propagates through the `GeneratorExit` handling and causes `RuntimeError` or unhandled exceptions.
**Solution**: In the generator's `finally` block, use `await asyncio.gather(*tasks, return_exceptions=True)` instead of awaiting tasks individually in try/except blocks. `return_exceptions=True` swallows `CancelledError` as a return value rather than raising it.
**Apply when**: Writing async generators with background `asyncio.Task` cleanup in `finally` blocks.

---

### L11: @ag-ui/client type mismatch with @copilotkit/runtime (Task 060)
**Problem**: `@copilotkit/runtime` bundles its own `@ag-ui/client@0.0.42` inside `@copilotkitnext/shared/node_modules/`. When you install `@ag-ui/client@0.0.44` at the top level and import `HttpAgent` from it, TypeScript sees two separate type declarations with incompatible private properties (`middlewares`), causing `Type 'HttpAgent' is not assignable to type 'AbstractAgent'`.
**Solution**: Cast the `HttpAgent` instance as `never` when passing it to `CopilotRuntime({ agents: { name: new HttpAgent({...}) as never } })`. The runtime API is structurally compatible — only the private type declarations conflict. Alternatively, pin `@ag-ui/client` to the exact version CopilotKit uses internally.
**Apply when**: Setting up CopilotKit `HttpAgent` in a Next.js API route. Check `@copilotkitnext/shared/node_modules/@ag-ui/client/package.json` for the version CopilotKit expects.

### L12: Mock side_effect exhaustion when adding pagination to existing methods (Task 062)
**Problem**: After adding pagination to `scrape_scholarships()` (default `max_pages=20`), existing tests that provided a finite `side_effect` list (e.g., 2 entries for 2 sources) broke with `StopAsyncIteration` because the pagination loop tried to fetch page 2, exhausting the mock list.
**Solution**: Add `max_pages=1` to existing tests that test single-page behavior, and write separate pagination tests with enough mock entries to cover the pagination loop (including a termination entry: `None` or empty HTML). The pagination loop stops on: (a) no HTML returned, (b) no listings extracted, (c) all listings are intra-scrape duplicates, (d) max_pages reached.
**Apply when**: Adding loops/pagination to any method that's already covered by tests using `side_effect`. Always check if existing mocks have enough entries for the new loop iterations.

### L13: asyncpg requires datetime objects, not ISO strings, for DateTime columns (Task 109)
**Problem**: When batch-inserting into `data_sources` with raw SQL via asyncpg, passing `datetime.now(timezone.utc).isoformat()` (a string) for the `scraped_at` column (which is `DateTime(timezone=True)`) causes `asyncpg.exceptions.DataError: invalid input for query argument: expected a datetime.date or datetime.datetime instance, got 'str'`.
**Solution**: Pass the actual `datetime` object directly as the parameter value. asyncpg's type system is strict — it expects Python types matching the PostgreSQL column types. Use `datetime.now(timezone.utc)` (not `.isoformat()`).
**Apply when**: Writing raw SQL with asyncpg/SQLAlchemy for DateTime columns. Never convert to string — pass datetime objects directly.

### L14: Vector pre-filter degree imbalance — use stratified UNION query (Task 117)
**Problem**: The vector pre-filter (`ORDER BY embedding <=> :vec LIMIT 300`) returned 244 Associates, 0 Bachelors out of 300 candidates. Associate programs numerically dominate the knowledge graph (most community colleges offer dozens of generic programs), so raw cosine similarity pulls them in disproportionately. This made matching results useless for bachelor-seeking students.
**Solution**: Replace the single `ORDER BY ... LIMIT` with a stratified UNION ALL query: Bachelor 40%, Associate 20%, Master 20%, Doctoral 10%, Other 10%. Each sub-query orders by cosine similarity within its degree level. This guarantees degree diversity in candidates while still using vector similarity for relevance within each tier.
**Apply when**: Any vector similarity search where one category vastly outnumbers others in the database. Raw top-K will always be dominated by the majority category. Use stratified/bucketed queries instead.

### L15: Simplified scoring beats complex modulation (Task 117)
**Problem**: The original per-dimension scoring used complex modulation: `keyword * 0.50 + similarity * 0.30 * modulator + precomputed * 0.20 * max(keyword, sim*0.5)`. This made scores unpredictable and hard to debug — small keyword overlaps (often 0-18%) would dampen the entire score chain. With 96K programs enriched, precomputed quality scores are the strongest signal but were being suppressed by low keyword overlap.
**Solution**: Simplified to `quality * 0.6 + relevance * 0.4` where `quality` is the precomputed IKIGAI dimension score (0-1) and `relevance = max(keyword_overlap, normalized_similarity)`. Also added `_normalize_similarity()` to map BGE-large-en-v1.5 cosine range (0.3-0.7) to 0-1 scale. This is transparent, debuggable, and lets enrichment data drive scores.
**Apply when**: Designing multi-signal scoring formulas. Start simple (weighted sum), add complexity only if simple formula can't distinguish cases. Multiplicative modulation creates unintuitive nonlinear effects.

### L16: CLI must use the full agent, not the simple tool (Task 117)
**Problem**: The CLI `brightstep match` command called `match_profile()` from `tools/ikigai_matcher.py` (vector-only cosine similarity) instead of `IKIGAIMatchingAgent.match()` (4-dimension IKIGAI scoring with enrichment data, career mappings, keyword overlap). This meant the entire enrichment pipeline's output was invisible to the CLI — users got raw cosine scores only.
**Solution**: Rewired `_run_match()` in `cli/main.py` to construct an `IKIGAIProfile` (Pydantic model with Passion, Talent, Mission, Vocation sub-models) and call `IKIGAIMatchingAgent(pre_filter_limit=300).match(profile, top_n=N, use_llm=False)`. The agent handles embedding, pre-filtering, IKIGAI dimension lookup, career mapping lookup, keyword extraction, and composite scoring.
**Apply when**: Adding CLI commands that exercise a feature. Always wire to the highest-level abstraction (Agent) rather than the lowest-level utility (tool). Check the full call chain: CLI → Agent → Tools → DB.

### L17: Vector pre-filter misses programs the student explicitly asked about (Post-117)
**Problem**: A student who typed "I love cooking" got zero Culinary Arts programs in their results — all top 10 were Chemistry. The vector pre-filter (cosine similarity on combined profile text) returned zero culinary programs in 300 candidates because: (1) "chem" in the profile text pulled Chemistry embeddings higher, (2) Chemistry programs vastly outnumber Culinary programs (~1983 vs ~179), (3) pre-computed quality scores at elite universities (Caltech Chemistry=0.81 vs Culinary=0.695) further widened the gap via the `quality * 0.6 + relevance * 0.4` formula.
**Solution**: Two-part fix: (1) **Keyword injection** (`_keyword_inject`): after vector pre-filter, search program names AND IKIGAI tags for terms from the student's hobbies, career interests, and causes; inject up to 50 candidates the embedding space missed. (2) **Adaptive blend** (`_adaptive_blend`): when keyword_overlap > 0, flip quality/relevance weighting from 60/40 to 40/60 — the student's expressed interest outweighs generic university prestige. Pure cooking profile → all top 10 are Culinary Arts.
**Apply when**: Any vector similarity search where the student's explicit terms don't map 1:1 to program names. Embeddings lose specificity when profile text mixes multiple interests. Always add a keyword safety net alongside vector search.

### L18: httpx CLOSE-WAIT stalls with TRT-LLM — disable keepalive (Enrichment Pipeline)
**Problem**: Long-running LLM enrichment batches (500 programs, ~25 min) would stall after 10-20 minutes. The httpx `AsyncClient` singleton reused connections via keepalive, but TRT-LLM closes idle connections server-side. httpx didn't detect the closed connections, leaving them in CLOSE-WAIT state. Once enough CLOSE-WAIT sockets accumulated (4-7), the asyncio event loop deadlocked waiting on dead sockets.
**Solution**: Disable connection keepalive in the httpx client: `httpx.AsyncClient(limits=httpx.Limits(max_keepalive_connections=0, max_connections=32))`. Each request opens a fresh TCP connection and closes it immediately after. This eliminated all CLOSE-WAIT accumulation — batches run 26+ minutes without interruption.
**Apply when**: Using httpx `AsyncClient` for long-running batch operations against TRT-LLM or any server that may close idle connections. Always set `max_keepalive_connections=0` when the client's request pattern involves bursts with idle gaps.

### L19: Qwen3 `<think>` tags in LLM JSON responses (Matching Agent)
**Problem**: When requesting JSON output from Qwen3 (thinking mode enabled), the response starts with `<think>...</think>` blocks followed by the actual JSON. The JSON parser tried to parse the entire response including think tags, failing with `JSONDecodeError`.
**Solution**: Strip think tags before JSON parsing: `re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()`. Import `re` at module level.
**Apply when**: Parsing structured output (JSON, XML) from Qwen3 or any model with thinking mode. Always strip thinking tags before parsing.

### L20: AsyncContextManager must use `async with`, not `await` (Task 171)
**Problem**: `research_university_scholarships()` used `session = await get_session()` but `get_session()` is an `@asynccontextmanager` — it returns an async generator, not a coroutine. Using `await` on it returns the context manager object instead of a session, causing silent failures or AttributeErrors when using the "session".
**Solution**: Always use `async with get_session() as session:` for context managers. Never `await` an `@asynccontextmanager`-decorated function.
**Apply when**: Calling any function decorated with `@asynccontextmanager` or `@contextmanager`. The pattern `session = await fn()` is wrong — use `async with fn() as session:` instead.

### L21: Enum member names must match exactly — no synonyms (Task 171)
**Problem**: `research_university_scholarships()` used `Recommendation.EXCLUDED` and `Recommendation.FLAGGED` but the actual enum members are `EXCLUDE` and `REVIEW`. Python's `Enum.__getattr__` raises `AttributeError` at runtime for non-existent members, not at import time.
**Solution**: Always verify enum member names against the actual definition. Don't assume synonyms exist (EXCLUDED≠EXCLUDE, FLAGGED≠REVIEW). IDE autocomplete or `grep class Recommendation` catches this instantly.
**Apply when**: Using enum values from another module. Verify exact names — Python enums have no fuzzy matching.

### L22: DB column width constraints vs web-scraped data (Task 171)
**Problem**: The `scholarships.deadline` column was `VARCHAR(50)` but web scraping produced "deadline" values that were actually description text (e.g., 200+ char descriptions mis-parsed as deadlines). Inserts failed with `value too long for type character varying(50)`.
**Solution**: (1) Widened column to `VARCHAR(255)` via `ALTER TABLE` + ORM model update. (2) For scraped data, the root cause is the scraper extracting description text into the wrong field — a parser fix would be more correct, but widening the column is a pragmatic defense-in-depth.
**Apply when**: Designing DB schemas for web-scraped data. Use `Text` for free-form fields, or use generous `VARCHAR` limits (255+). Web data is inherently noisy — tight constraints cause silent data loss.

### L23: Clerk validates publishableKey at build time during static generation (Task 196)
**Problem**: `next build` with `ClerkProvider` in root layout tries to prerender all pages. With a placeholder `pk_test_placeholder` key, Clerk throws `The publishableKey passed to Clerk is invalid` during static page generation, killing the build.
**Solution**: Add `export const dynamic = "force-dynamic"` to the root layout. This skips static prerendering for all pages (which is correct anyway since Clerk auth is inherently dynamic). Also wrap `CopilotKit` in a separate `"use client"` provider component (`components/providers.tsx`) since it uses React context.
**Apply when**: Setting up Clerk in a Next.js App Router project. Without valid Clerk keys, builds will fail unless all pages using Clerk components are dynamic.

### L24: Llama 3.3 JSON output — book titles and subject_grades format (Task 221)
**Problem**: When generating synthetic profiles as JSON, Llama 3.3 70b produces two recurring parse errors: (1) Book titles with internal quotes break JSON arrays — `"The Selfish Gene" by Richard Dawkins` inside a JSON string creates an unescaped quote. (2) `subject_grades` returned as `[{"subject": "X", "grade": "Y"}]` (list of dicts) instead of the expected `{"X": "Y"}` dict, causing Pydantic validation failure.
**Solution**: (1) Add `_repair_json()` with regex: `re.sub(r'"([^"]+)"\s+(by\s+[^",\]\}]+)', lambda m: f'"{m.group(1)} {m.group(2).strip()}"', text)` to merge `"Title" by Author` into `"Title by Author"`. Also strip trailing commas and JS-style comments. (2) Add `_normalize_grades()` that accepts both `dict` and `list-of-dict` formats and normalizes to `{subject: grade}`. Call repair as a fallback before re-parsing on initial JSONDecodeError.
**Apply when**: Requesting JSON output from Llama 3.3 (or similar open models). Always implement a JSON repair layer — LLMs don't reliably produce valid JSON. Common issues: unescaped quotes in values, trailing commas, list-vs-dict format mismatches.

---

**This file is the single source of truth for the BrightStep.AI build.**
