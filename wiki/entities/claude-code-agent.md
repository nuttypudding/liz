---
type: entity
tags: [agent, claude-code, automation, wiki, development-process]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# Claude Code Agent

Claude Code is an active participant in the Liz development process, not merely a code generator. It runs skills (slash commands), executes backlog tasks autonomously, maintains the wiki, and makes architectural decisions within the boundaries set by BrightStep process rules and CLAUDE.md.

## Role in the Development Workflow

Claude Code operates as the primary implementer of feature tasks. The workflow is:

1. Tasks are created in `features/inprogress/<feature>/backlog/` with model-tier-encoded filenames
2. `autonextstep.py` (or `/nextstep`) picks the next ready task and invokes Claude Code
3. Claude Code reads the task file, implements the work, moves the task file to `done/`
4. On feature completion, Claude Code creates a PR and `autonextstep.py` merges it

This process was formalized in [[decisions/2026-04-01-adopt-brightstep-process]]. The automated task runner allows unattended feature execution.

## Skills Claude Code Runs

Skills are slash commands defined in `.claude/skills/`. Active skills as of Phase 1:

| Skill | Purpose |
|-------|---------|
| `/nextstep` | Pick and execute the next backlog task |
| `/plan-feature` | Create a feature plan + ticket + branch |
| `/fix-bug` | Ticket-first bug fix workflow |
| `/ship` | Tests + doc sweep + commit |
| `/merge-to-main` | Push branch + PR + merge |
| `/test-fix-prod` | Autonomous prod smoke test + fix loop |
| `/deploy-prod` | Vercel production deployment |

## How Claude Code Uses the Wiki

The wiki is Claude Code's persistent knowledge base. Prior to this (pre-task 247), Claude had to re-derive context from raw source files on every query — no compounding. After the LLM Wiki adoption per [[decisions/2026-04-12-adopt-llm-wiki-pattern]], Claude Code:

- Reads `wiki/index.md` to locate relevant pages
- Cites `[[decisions/...]]` and `[[project/...]]` pages when making non-trivial implementation choices
- Appends to `wiki/log.md` on every wiki-modifying operation
- Maintains `wiki/status.md`, `wiki/for-liz.md`, and `wiki/qa-queue.md` on feature lifecycle events
- Uses qmd (hybrid BM25/vector search) for retrieval when pages exceed direct navigation — see [[project/workflow/qmd-search]]

## Live State Claude Code Reads

These files are not in the wiki — they are operational state Claude reads directly:

| File | What It Tracks |
|------|---------------|
| `.claude/tickets.md` | Open/in-progress/deployed tickets |
| `features/roadmap.md` | Feature status across phases |
| `features/inprogress/*/backlog/` | Pending tasks for the current feature |
| `.claude/feature-lifecycle.json` | Current feature branch lifecycle state |
| `CLAUDE.md` | Project rules, conventions, overrides |

## Model Tier System

Task filenames encode which Claude model tier should execute the task:

| Prefix | Tier | Use Case |
|--------|------|---------|
| `Haiku-` | Claude Haiku | Config, tests, docs, scaffolding |
| `Sonnet-` | Claude Sonnet | Guided implementation with clear design |
| `Opus-` | Claude Opus | Architecture, front-end design, critical judgment |

Front-end work is always Opus. This cost-control system was adopted in [[decisions/2026-04-01-adopt-brightstep-process]].

## Constraints

- Never acts autonomously on landlord data — approval gates apply to the product; the agent itself may act autonomously on development tasks
- All commits require a ticket reference
- Never skips hooks (`--no-verify`) or force-pushes to main without explicit instruction
- Wiki citations must point to existing pages — forward references are documented in the `## Extracted` section of source pages

## Related

- [[decisions/2026-04-01-adopt-brightstep-process]] — the process Claude Code operates within
- [[decisions/2026-04-12-adopt-llm-wiki-pattern]] — the wiki Claude Code maintains
- [[project/workflow/brightstep-process]] — full BrightStep process reference
- [[project/workflow/qmd-search]] — qmd search integration Claude uses for wiki queries
