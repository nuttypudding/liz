---
name: update-docs
description: Scan git diff for changed files and update all affected documentation. Use after making code changes to keep docs in sync.
model: haiku
argument-hint: "[scope — e.g., 'cli changes' or 'all']"
---

# Update Documentation

Scan recent changes and update all affected documentation files to stay in sync.

## Step 1: Identify Changes

Run `git diff --name-only HEAD` (unstaged) and `git diff --name-only --cached` (staged) to see what files changed. If nothing is staged or modified, also check `git diff --name-only HEAD~1` (last commit).

If `$ARGUMENTS` is provided, use it to narrow the scope (e.g., "cli changes" means only check CLI-related docs).

## Step 2: Analyze Impact (Explore Agent)

Spawn an **Explore agent** using the Task tool to do the cross-reference analysis without cluttering the main context:

> "Analyze these changed files for documentation impact: `<list of changed files>`.
>
> Check each file against this doc-mapping table and report which docs need updates:
> - `src/brightstep/cli/**` → `docs/cli-usage.md`
> - `infrastructure/**` → `docs/runbook.md`
> - LLM/Docker model changes → `docs/local-llm.md`
> - `src/brightstep/agents/**` → `docs/architecture.md`
> - `src/brightstep/db/**` → `docs/schema.md`
> - `plan/*.md` → `plan/README.md` TOC
> - `.env.example` changes → all docs referencing env vars
> - Port changes → `docs/runbook.md`, `docker-compose.yml`, `.env.example`
>
> Also cross-reference check:
> - Ports match between `infrastructure/docker-compose.yml`, `.env.example`, and docs
> - CLI commands in docs match `src/brightstep/cli/main.py`
> - Environment variables in docs match `.env.example`
> - Internal links between docs point to existing files
> - Feature statuses (PLANNED, IMPLEMENTED, COMPLETE) are current
> - Feature status changes → `features/roadmap.md`
>
> Return a structured report: (1) which docs need updates and what to change, (2) any cross-reference mismatches found, (3) docs that are already up to date."

## Step 3: Apply Updates

Using the Explore agent's report, make the actual edits to the affected docs in the main context. Only touch docs that the analysis identified as needing changes.

## Doc-Mapping Reference

Always check these mappings when analyzing impact:

| Changed File Pattern | Update This Doc | What to Check |
|---------------------|-----------------|---------------|
| `src/brightstep/cli/**` | `docs/cli-usage.md` | Command names, flags, examples |
| `infrastructure/**` | `docs/runbook.md` | Ports, container names, startup commands |
| LLM/Docker/model changes | `docs/local-llm.md` | Model names, endpoints, config |
| `src/brightstep/agents/**` | `docs/architecture.md` | Agent names, responsibilities, data flow |
| `src/brightstep/db/**` | `docs/schema.md` | Tables, columns, relationships |
| `plan/*.md` | `plan/README.md` | TOC entries, section order |
| Arch/tech decisions | `plan/DECISION_LOG.md` | New row with date + rationale |
| `.env.example` | All docs referencing env vars | Variable names, defaults |
| Port changes | `docs/runbook.md` + `docker-compose.yml` + `.env.example` | Port numbers match everywhere |
| New features | `features/planned/<name>/README.md` | Feature plan exists |
| Feature status changes | `features/roadmap.md` | Phase, status, feature ordering |
| `apps/**` (frontend) | `docs/workflow.md` | Skills table, rules table if new rules added |
| `.claude/agents/**` | `docs/workflow.md` | Agent descriptions, file reference tree |
| `.claude/rules/**` | `docs/workflow.md` | Rules table |
| `.claude/skills/**` | `docs/workflow.md` | Skills table |
| `samples/**` | `samples/README.md` | Sample list, run commands |
| Any feature/service/port/DB change | `plan/system_map.md` | Architecture diagrams, service directory, data flows, training progress |

## Step 4: Report

After updating, report:
- Which files triggered doc updates
- Which docs were updated (with brief description of changes)
- Any cross-reference issues found and fixed
- Any docs that are already up to date (no changes needed)
