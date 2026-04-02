# /create-feature-tasks-in-backlog — Generate Task Files

Feature name: `$ARGUMENTS`

If no name provided, ask the user.

## Workflow

### 1. Read Feature Plan

Find the feature plan directory matching the name in `features/planned/` or `features/inprogress/`. Plans follow the naming convention `P{phase}-{seq:03d}-{kebab-name}/README.md`.

Search `features/planned/` and `features/inprogress/` for a directory containing `<feature-name>`. If not found, tell the user to run `/plan-feature <name>` first.

### 2. Explore Codebase

Launch an Explore agent to scan the project for:
- Existing code patterns and conventions
- Related implementations to follow
- Actual function signatures and file structures

### 3. Classify Tasks

Break the feature plan into individual tasks. Classify each by tier:

| Tier | Prefix | Use For |
|------|--------|---------|
| Haiku | `Haiku-` | Scaffolding, CRUD, config, tests, docs, migrations, CLI |
| Sonnet | `Sonnet-` | Implementation from clear design, API integration, pipelines |
| Opus | `Opus-` | Architecture design, front-end design, complex judgment |

**Front-end work is always Opus.**

### 4. Find Next Task ID

Check across all `features/inprogress/*/backlog/`, `features/inprogress/*/doing/`, `features/inprogress/*/done/`, and `features/completed/*/done/` for the highest existing task ID. Start from the next number.

### 5. Ensure Feature Directory Structure

If the feature is still in `features/planned/`, move it to `features/inprogress/` and create the task subdirectories:

```bash
mv features/planned/<feature>/ features/inprogress/
mkdir -p features/inprogress/<feature>/{backlog,doing,done}
```

If already in `features/inprogress/`, ensure `backlog/`, `doing/`, `done/` exist.

### 6. Write Task Files

For each task, create `features/inprogress/<feature>/backlog/{id:03d}-{Tier}-{kebab-title}.md`:

```markdown
---
id: NNN
title: Task title
tier: Haiku|Sonnet|Opus
depends_on: [list of task IDs this depends on]
feature: <feature-name>
---

# NNN — Task Title

## Objective
What this task accomplishes.

## Context
Relevant background, links to feature plan, existing code references.

## Implementation
Step-by-step guidance with specific file paths and function names.

## Acceptance Criteria
1. [ ] Verify correct model tier ({Tier})
2. [ ] ...specific criteria...
3. [ ] All tests pass
```

### 7. Set Dependencies

Use `depends_on` in frontmatter to express ordering. Foundation tasks (scaffolding, schema) come first.

### 8. Update Tracking

- Update `features/roadmap.md` with task ID range
- List generated tasks in the feature plan's Tasks section

### 9. Report

- Number of tasks created
- Task ID range
- Tier breakdown (how many Haiku/Sonnet/Opus)
- Dependency graph summary
- Next step: `/nextstep` or `python scripts/autonextstep.py`
