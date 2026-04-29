# BrightStep.AI — Feature Task Generator

> **Usage**: `/create-feature-tasks-in-backlog <feature-name>`
> Example: `/create-feature-tasks-in-backlog admin-dashboard`
> Reads `features/planned/<feature-name>/README.md` and generates individual task files in `plan/Backlog/`

---

## Instructions for Claude

You are generating individual backlog task files from a feature plan. Follow these steps **exactly** in order.

### Step 0: Read Lessons Learned

Read the **Lessons Learned** section at the bottom of `.claude/commands/nextstep.md`. These are hard-won patterns from previous task runs — apply them when writing task descriptions.

### Step 1: Parse Feature Name

The argument `$ARGUMENTS` is the feature name (kebab-case slug).

- If no argument provided, list available features:
  ```bash
  ls features/planned/
  ```
  Then ask the user: "Which feature should I generate tasks for?" and list the options.
- Validate the feature plan exists: `features/planned/<feature-name>/README.md`
- If it doesn't exist, tell the user: "No feature plan found at `features/planned/<feature-name>/README.md`. Run `/plan-feature <feature-name>` first."

### Step 2: Read the Feature Plan

Read `features/planned/<feature-name>/README.md` in full. Extract:

1. **Feature title** (from the `# heading`)
2. **Implementation Tasks table** (the `| # | Task | Effort | Depends On |` table)
3. **Tech Stack** (technologies involved)
4. **Architecture** (component relationships)
5. **File Structure** (proposed files)
6. **What It Does** sections (detailed requirements per component)

The Implementation Tasks table is the primary source — each row becomes one task file.

### Step 3: Determine Task ID Range

Find the highest existing task ID across all directories:

```bash
ls features/completed/*/     # completed tasks
ls plan/Backlog/ 2>/dev/null  # pending tasks
ls plan/Doing/ 2>/dev/null    # in-progress tasks
```

The new tasks start at `(highest existing ID) + 1`. Zero-pad to 3 digits (e.g., 049, 050, 051...).

### Step 4: Classify Haiku, Sonnet, or Opus

**This is critical.** Each task gets a model tier prefix based on complexity. Use these rules:

#### Opus Tasks (novel design, architecture, critical judgment)
Assign `Opus-` when the task involves ANY of:
- **Novel agent design**: Creating a new agent class with complex behavior, multi-step reasoning, or architectural decisions where no existing pattern applies
- **Novel schema/model design**: Designing data models, database schemas, or API contracts that affect multiple components AND require non-obvious trade-offs
- **Novel algorithm design**: Implementing matching algorithms, scoring systems, or analysis pipelines with no existing reference implementation
- **Architecture decisions**: Tasks where "how to structure it" is the hard part and no existing pattern to follow
- **Validation & go/no-go decisions**: Tasks requiring judgment on metrics interpretation and whether to proceed
- **Front-end design**: Building, designing, or significantly modifying UI components, layouts, CSS, responsive design — always Opus

#### Sonnet Tasks (moderate complexity, well-constrained implementation)
Assign `Sonnet-` when the task involves ANY of:
- **Implementation from a clear design**: Building something where the architecture/API was already decided by a prior Opus task
- **Following established patterns**: Implementing a module that closely follows patterns already present in the codebase (e.g., building a new trainer when an existing trainer pattern exists)
- **Integration with clear contracts**: Wiring components together where the interfaces are well-defined but the work requires more reasoning than Haiku
- **Moderate ML work**: Training runs with pre-defined hyperparameters, data pipelines with clear input/output contracts
- **Tool/pipeline implementation**: Building a multi-step pipeline where each step is straightforward but the overall orchestration needs care
- **Adapting existing patterns to new domains**: E.g., applying the Groq batch pattern to a new entity type, or adapting an existing CLI command structure for a new subsystem

#### Haiku Tasks (implementation, wiring, routine)
Assign `Haiku-` when the task involves ANY of:
- **Scaffolding**: Creating project structure, installing packages, boilerplate setup
- **CRUD/config**: Adding env vars, config files, connection setup
- **Wiring**: Connecting two existing systems with a clear interface
- **Testing/verification**: Writing tests, running verification, creating reference docs
- **Documentation**: Reference docs, runbooks, guides
- **Infrastructure**: Docker containers, CI/CD steps, deployment config
- **Schema migrations**: SQL DDL with clear column specs (no design decisions)
- **CLI commands**: Typer commands that wire existing backend functions

#### Decision Table

| Task Pattern | Tier | Rationale |
|-------------|------|-----------|
| "Scaffold / Setup / Install" | Haiku | Boilerplate, clear steps |
| "Create FastAPI stats queries" | Haiku | SQL queries, routine implementation |
| "Add Redis pub/sub events" | Haiku | Small, focused change |
| "Create CLI command" | Haiku | Routine wiring |
| "Create DB migration (ALTER TABLE)" | Haiku | DDL with clear spec |
| "Write tests for module X" | Haiku | Test patterns well-established |
| "Update docs / runbook" | Haiku | Documentation, no design |
| "Implement X trainer (hyperparams defined)" | **Sonnet** | Execution with pre-defined design |
| "Build data pipeline (clear input→output)" | **Sonnet** | Moderate complexity, clear contracts |
| "Integrate module into existing system" | **Sonnet** | Well-defined interfaces, needs care |
| "Follow established pattern for new domain" | **Sonnet** | Adapting, not inventing |
| "Implement alert/notification pipeline" | **Sonnet** | Uses existing MCP/Redis patterns |
| "Build UI panel (shadcn + Recharts)" | **Opus** | Front-end design — always Opus |
| "Add responsive CSS / media queries" | **Opus** | Front-end design — always Opus |
| "Format HTML cards / grid layout" | **Opus** | Front-end design — always Opus |
| "Design new agent class" | **Opus** | Novel architecture |
| "Design data schema (multi-component)" | **Opus** | Architecture decision |
| "Implement novel algorithm" | **Opus** | No reference to follow |
| "Validation run + go/no-go judgment" | **Opus** | Requires metric interpretation |

**When in doubt between Sonnet and Opus, choose Opus.** When in doubt between Haiku and Sonnet, choose Sonnet. It's better to over-allocate reasoning than under-allocate.

### Step 5: Explore the Codebase

**Before writing any task files**, read the source code that each task will interact with. This is critical — task files with wrong function names, wrong file paths, or wrong patterns waste more time than they save.

**For each task**, identify and read:
1. **Files the task will modify** — get actual function signatures, class APIs, import paths
2. **Existing patterns** — how similar things are done elsewhere in the codebase (e.g., how other CLI commands are structured, how other tests mock the DB, how other config fields are loaded)
3. **Adjacent code** — files that the new code must integrate with (e.g., if adding a CLI command, read the existing CLI module; if adding tests, read the test conftest.py)

**Minimum reads:**
- `tests/conftest.py` — existing test fixtures and patterns
- The module being extended (e.g., `src/brightstep/enrichment/cli.py` if adding CLI commands)
- The config module if new config fields are needed
- Any module that exports types/functions the new code will import

**Record what you find** — exact function signatures, class constructors, constant names, import paths. These go directly into the task files.

### Step 6: Write Task Files

For each row in the Implementation Tasks table, create a file in `plan/Backlog/` following the format below.

#### File Naming

```
plan/Backlog/{id:03d}-{Tier}-{kebab-case-title}.md
```

Examples:
- `plan/Backlog/049-Haiku-scaffold-nextjs-app.md`
- `plan/Backlog/050-Sonnet-implement-ranker-trainer.md`
- `plan/Backlog/051-Opus-wire-copilotkit-ag-ui.md`

#### Unified Task Template

**All tiers get detailed, codebase-grounded implementation context.** The difference is in framing:
- **Haiku**: Prescriptive — "Follow these steps exactly. Don't make design decisions."
- **Sonnet**: Guided — "Here's the design from the prior Opus task and existing patterns. Implement it, adapting as needed."
- **Opus**: Advisory — "Here's what exists and the constraints. You decide the architecture, but use this context."

Every task file must include exact file paths, function signatures, existing patterns, and gotchas gathered from Step 5. A task file with wrong method names or stale assumptions is worse than a vague one.

```markdown
---
id: "{id:03d}"
title: "{Task title from the Implementation Tasks table}"
priority: {CRITICAL|HIGH|MEDIUM|LOW}
week: {week number — group by logical phase}
depends_on: [{array of task IDs this depends on}]
feature: "{feature-name}"
---

## Description

{2-6 sentences explaining what this task does and why, in context of the feature.
Opus tasks should include architectural context — how this fits in the larger system.
Haiku tasks should focus on the concrete deliverable.}

### Requirements

{Bulleted list of specific requirements extracted from the feature plan's relevant sections.}

### Architecture Context

{REQUIRED FOR OPUS and SONNET. Optional but helpful for Haiku.
How this task fits into the larger feature architecture:}
- What components this interacts with (with file paths)
- Data flow in and out
- Key design decisions to make (Opus), key design decisions from prior tasks to follow (Sonnet), or key design decisions already made (Haiku)

### Implementation Plan

{REQUIRED FOR BOTH TIERS. Grounded in actual codebase exploration from Step 5.

For Haiku — prescriptive step-by-step:}
1. **Step title**: What to do exactly
   - Specific file paths to create/modify
   - Code snippets with correct imports and function signatures
   - Exact patterns copied from existing codebase (e.g., "follow the same pattern as `enrich_app.command()` in cli.py:23")

{For Opus — suggested approach with context:}
1. **Step title**: What to accomplish
   - Existing code to integrate with (file:line, function signatures)
   - Patterns used elsewhere that should be followed or intentionally diverged from
   - Constraints from dependent tasks or downstream consumers

### Existing Code Context

{REQUIRED FOR BOTH TIERS. Concrete details discovered during Step 5:}
- **Relevant function signatures**: e.g., `get_enrichment_config() -> EnrichmentConfig` (config.py:57)
- **Existing patterns to follow**: e.g., "CLI commands use `asyncio.run(_async_helper())` bridge pattern (cli.py:25)"
- **Import paths**: e.g., `from brightstep.enrichment.config import EnrichmentConfig, get_enrichment_config`
- **Test patterns**: e.g., "Use `AsyncMock` for DB session, `MagicMock` for sync objects (see conftest.py autouse fixture)"
- **Constants/config**: e.g., "`UMAP_MODEL_KEY = 'graph:umap:fitted_model'` (umap_service.py:18)"

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `path/to/file.ext` | Create | ... |
| `path/to/existing.ext` | Modify (line N) | ... |

### Gotchas

{REQUIRED FOR BOTH TIERS. Bulleted list of specific pitfalls to avoid. Pull from:}
- Lessons Learned in nextstep.md (reference by number, e.g., "See L02")
- Known issues with the tech stack discovered during codebase exploration
- Edge cases from the feature plan's Open Questions
- Common mistakes for this type of task
- **For Opus**: Integration constraints that limit design freedom
- **For Haiku**: Exact things that will break if done wrong (wrong import, wrong method name, sync vs async)

### Example Output

{Optional for both tiers. What the end result looks like:
API response shape, CLI output, test output, UI mockup description, etc.}

## Acceptance Criteria

- [ ] Model tier verified — switched to {Haiku|Sonnet|Opus} (`/model {haiku|sonnet|opus}`) before starting
- [ ] {Specific file created/modified with path}
- [ ] {Specific function/feature implemented with verification method}
- [ ] {Design quality criterion (Opus) — e.g., "Clean separation between X and Y"}
- [ ] {Tests written and passing — specify expected test count if known}
- [ ] {Integration verified — how to confirm it works end-to-end}
```

#### Tier-Specific Guidance

**When writing Haiku tasks:**
- Implementation Plan should be copy-paste ready — exact code snippets, exact imports
- If a task depends on a file created by a Sonnet/Opus task that hasn't run yet, note: "Read `<file>` FIRST — created by task NNN. Adapt method names, signatures, and patterns to match the actual implementation."
- Gotchas should include specific failure modes: "Use `MagicMock()` not `AsyncMock()` for `.json()` (see L02)"
- Acceptance criteria should be binary and verifiable: "`pytest tests/test_foo.py -v` passes with 10+ tests"

**When writing Sonnet tasks:**
- Implementation Plan should reference the prior Opus task's design and existing codebase patterns — e.g., "Follow the architecture from task 361's triplet strategy"
- Sonnet tasks typically depend on a prior Opus task that made the design decisions — reference those decisions explicitly
- Include enough context that Sonnet can implement without re-deriving the architecture, but leave room for implementation-level judgment
- Gotchas should include both architectural constraints (from the prior design task) AND implementation pitfalls
- Acceptance criteria should be concrete and verifiable, similar to Haiku but with some quality criteria

**When writing Opus tasks:**
- Implementation Plan should provide context and constraints, not dictates
- Include "Design Decisions to Make" as a subsection — what the model needs to decide
- Existing Code Context should emphasize integration points and contracts that downstream tasks depend on
- Gotchas should include architectural constraints: "The ingestor (task 154) depends on `custom_id` format being `<type>:<uuid>` — don't change this"
- Acceptance criteria should include design quality: "Clean async/sync boundary — no `asyncio.run()` inside async methods"

### Step 7: Map Dependencies

Convert the "Depends On" column from the feature plan's Implementation Tasks table into task IDs.

**Rules:**
- If the feature plan says task 3 depends on task 1, and task 1 maps to ID 049, task 3's `depends_on` is `["049"]`.
- If a task depends on something from a PREVIOUS feature (e.g., an existing completed task), use that task's original ID.
- Cross-feature dependencies: If the task requires infrastructure or code from another feature, reference the completed task ID from `features/completed/`.
- **First task(s)** in a feature should depend on the last relevant completed task, or `[]` if truly independent.

### Step 8: Assign Priority

| Priority | When to Use |
|----------|------------|
| CRITICAL | Blocks most other tasks; foundational setup; schema/infrastructure |
| HIGH | Core feature functionality; on the critical path |
| MEDIUM | Important but not blocking; UI panels, secondary features |
| LOW | Nice-to-have; documentation, optimization, polish |

### Step 9: Assign Week Numbers

Group tasks into logical implementation phases (weeks). Tasks in the same week can be worked on in parallel (assuming dependencies allow). Use the feature plan's dependency chain to determine ordering:

- **Week N**: Foundation (scaffold, setup, config)
- **Week N+1**: Core backend (APIs, data layer, agents)
- **Week N+2**: Core frontend (UI components, state management)
- **Week N+3**: Integration (wiring, end-to-end, verification)

Start week numbering from where the last feature left off (check `features/completed/` for the highest week number).

### Step 10: Enrich from Feature Plan + Codebase

Don't just copy the one-line task description from the table. **Pull relevant details** from TWO sources:

**From the feature plan:**
- **What It Does** sections → Requirements and Implementation Plan
- **Architecture** diagram → Architecture Context
- **File Structure** → Files to Create/Modify
- **Data Flow** → Integration details
- **Open Questions** → Gotchas or notes

**From the codebase (Step 5 exploration):**
- **Actual function signatures** → Existing Code Context, correct imports in code snippets
- **Existing patterns** → Implementation Plan steps that reference real patterns (with file:line)
- **Test fixtures** → Gotchas about mocking patterns, singleton resets, async vs sync
- **Config loading** → Exact env var names, factory function patterns
- **Adjacent modules** → Integration constraints, shared types, import paths

Each task file should be **self-contained** — someone reading just the task file (without the feature plan or access to the codebase) should understand what to build, how existing code works, and how to verify the result.

### Step 11: Validate & Present

After creating all task files:

1. **List all created files** with their tier and title:
   ```
   plan/Backlog/049-Haiku-scaffold-nextjs-app.md
   plan/Backlog/050-Haiku-install-copilotkit-ag-ui.md
   plan/Backlog/051-Haiku-create-fastapi-stats-queries.md
   ...
   ```

2. **Show the dependency graph** (which tasks block which):
   ```
   049 → 050 → 054
   049 → 051 → 052 → 053
   051, 054 → 055
   ```

3. **Show the tier breakdown**:
   ```
   Haiku tasks:  8 (routine implementation)
   Sonnet tasks: 3 (guided implementation)
   Opus tasks:   5 (architecture/design)
   Total:       16 tasks
   ```

4. **Show the week schedule**:
   ```
   Week 11: 049, 050, 051 (foundation)
   Week 12: 052, 053, 054 (core)
   Week 13: 055, 056, 057 (integration)
   ```

5. **Update nextstep.md**: Add a new section under "Completed Features" for the new feature (as "In Progress"):
   ```markdown
   ### Feature: <Feature Name> (tasks XXX–YYY) — IN PROGRESS

   | # | Task | Model | Status |
   |---|------|-------|--------|
   | XXX | Task title | Haiku/Sonnet/Opus | Pending |
   | ... | ... | ... | ... |
   ```

6. **MANDATORY — Update `features/roadmap.md`**: Read the file, find the feature's row in the appropriate phase table, and update it with the task range (e.g., `XXX-YYY` in the Tasks column) and a link to the plan. If the feature doesn't have a row yet, add one. This is the single source of truth for feature tracking — it must always reflect current task ranges and plan links.

7. **Ask the user**: "Created {N} task files in `plan/Backlog/`. The dependency chain looks correct and tasks are ready for `/nextstep`. Want me to adjust any tasks, change any Haiku↔Sonnet↔Opus assignments, or modify dependencies?"

---

## Quality Checklist

Before presenting to the user, verify:

- [ ] Every task file has valid YAML frontmatter (id, title, priority, week, depends_on, feature)
- [ ] Every task file starts with model tier verification as the first acceptance criterion
- [ ] Task IDs are sequential with no gaps
- [ ] File names match pattern: `{id:03d}-{Tier}-{kebab-case}.md`
- [ ] Dependencies form a valid DAG (no circular dependencies)
- [ ] At least one task has `depends_on: []` (the entry point)
- [ ] **ALL tasks** (Haiku, Sonnet, and Opus) have: Implementation Plan, Existing Code Context, Files to Create/Modify, Gotchas
- [ ] Opus and Sonnet tasks additionally have: Architecture Context
- [ ] Opus tasks include "Design Decisions to Make" subsection
- [ ] All file paths in task descriptions verified against actual codebase (Step 5 exploration)
- [ ] All function signatures, import paths, and method names match actual source code
- [ ] Codebase was explored (Step 5) before writing task files — not just the feature plan
- [ ] No task duplicates work already done in `features/completed/`
- [ ] Feature name in YAML matches the feature directory name
- [ ] Tasks that depend on not-yet-created files include "Read the actual file FIRST" warnings
- [ ] `features/roadmap.md` updated with task range and plan link for this feature
