---
type: project
tags: [workflow, process, setup, brightstep, portable]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: brightstep_process/README.md
---

# BrightStep Development Process — Portable Export

A complete, portable copy of the BrightStep.AI Claude Code development workflow. Copy this folder into any project to replicate the same skills, rules, agents, hooks, and workflows.

## What's Inside

```
brightstep_process/
├── README.md                              ← You are here (setup guide)
├── PROCESS.md                             ← Master process reference (all 13 sections)
├── claude-md-template.md                  ← CLAUDE.md starter for new projects
├── .claude/
│   ├── settings.json                      ← Hooks + plugin config (commit this)
│   ├── settings.local.json.example        ← Permission allowlist template (gitignored)
│   ├── tickets.md.template                ← Ticket tracker starter
│   ├── commands/                          ← Legacy skills (3 files)
│   │   ├── nextstep.md                    ← Pick + execute next backlog task
│   │   ├── plan-feature.md                ← Create feature plan + ticket + branch
│   │   └── create-feature-tasks-in-backlog.md ← Generate task files from plan
│   ├── skills/                            ← Skills / slash commands (15 dirs)
│   │   ├── fix-bug/SKILL.md               ← Ticket-first bug fix workflow
│   │   ├── log-bug/SKILL.md               ← Create bug ticket
│   │   ├── ship/SKILL.md                  ← Tests + docs + commit (user-only)
│   │   ├── review-changes/SKILL.md        ← Security + architecture review
│   │   ├── update-docs/SKILL.md           ← Scan diff + update docs
│   │   ├── test-all/SKILL.md              ← Run all test tiers
│   │   ├── test-fix-dev/SKILL.md          ← Autonomous local QA
│   │   ├── test-fix-prod/SKILL.md         ← Autonomous production QA
│   │   ├── overnight-qa/SKILL.md          ← Comprehensive overnight QA loop
│   │   ├── deploy-prod/SKILL.md           ← Production deployment
│   │   ├── run-dev/SKILL.md               ← Start local dev servers
│   │   ├── run-arena-dev/SKILL.md         ← Start chat arena (Gradio)
│   │   ├── notify/SKILL.md                ← Pushover notifications
│   │   ├── autorunner-status/SKILL.md     ← Check autorunner progress
│   │   └── brightstep-process/SKILL.md    ← This export skill
│   ├── agents/                            ← Spawnable subagents (5 files)
│   │   ├── ux-designer.md                 ← UI planning (no code)
│   │   ├── ui-builder.md                  ← UI implementation from spec
│   │   ├── ui-refiner.md                  ← UI polish + a11y
│   │   ├── streamlit-chat.md              ← Streamlit chat builder
│   │   └── gradio-chat.md                 ← Gradio chat builder
│   ├── rules/                             ← Path-scoped rules (7 files)
│   │   ├── documentation.md               ← docs/** — cross-ref consistency
│   │   ├── plan-changes.md                ← plan/** — decision log, TOC
│   │   ├── python-backend.md              ← src/**/*.py — DDD, config, gotchas
│   │   ├── typescript-frontend.md         ← apps/**/*.{ts,tsx} — shadcn, strict TS
│   │   ├── task-execution.md              ← plan/Backlog/** — model tier switching
│   │   ├── shadcn-workflow.md             ← apps/**/*.{ts,tsx} — MCP-first UI
│   │   └── chat-ui-samples.md             ← samples/** — dual Streamlit+Gradio
│   └── hooks/
│       └── post-commit-reminder.sh        ← Nudge to run /update-docs
└── scripts/
    └── autonextstep.py.reference          ← Automated task runner (reference copy)
```

## Quick Start — New Project Setup

### 1. Copy `.claude/` to your project root

```bash
cp -r brightstep_process/.claude /path/to/your-project/.claude
```

### 2. Create your CLAUDE.md

```bash
cp brightstep_process/claude-md-template.md /path/to/your-project/CLAUDE.md
```

Edit it to replace all `<!-- Replace with ... -->` placeholders with your project details.

### 3. Set up permissions

```bash
cp brightstep_process/.claude/settings.local.json.example \
   /path/to/your-project/.claude/settings.local.json
```

Review and customize the permission allowlist for your tools and commands.

### 4. Initialize ticket tracker

```bash
cp brightstep_process/.claude/tickets.md.template \
   /path/to/your-project/.claude/tickets.md
```

### 5. Create required directories

```bash
mkdir -p plan/Backlog plan/Doing
mkdir -p features/planned features/completed
mkdir -p docs
```

### 6. Customize skills, rules, and agents

**Skills that work as-is** (no project-specific changes needed):
- `/ship` — universal test + commit workflow
- `/review-changes` — universal security review
- `/update-docs` — universal doc sync (customize the mapping table in SKILL.md)
- `/log-bug` — universal ticket creation
- `/fix-bug` — universal bug fix workflow
- `/nextstep` — universal task runner (customize Lessons Learned references)

**Skills that need editing** for your project:
- `/run-dev` — update ports, commands, service names
- `/deploy-prod` — update deployment targets (Railway, Vercel, etc.)
- `/test-fix-dev` — update endpoints, test expectations
- `/test-fix-prod` — update production URLs
- `/notify` — update notification service (Pushover API key)
- `/overnight-qa` — update feature list and test expectations

**Agents that need customization**:
- `ux-designer`, `ui-builder`, `ui-refiner` — update project-specific context
- `streamlit-chat`, `gradio-chat` — update if your project uses chat interfaces

**Rules that need customization**:
- `python-backend.md` — update DDD contexts, known gotchas for your stack
- `typescript-frontend.md` — update framework (Next.js, Nuxt, SvelteKit, etc.)
- `documentation.md` — update cross-reference targets
- `task-execution.md` — works as-is if you follow the same task file format

### 7. Git configuration

Add to `.gitignore`:
```
.claude/settings.local.json
.claude/worktrees/
```

Commit to git:
```
.claude/settings.json
.claude/commands/
.claude/skills/
.claude/agents/
.claude/rules/
.claude/hooks/
.claude/tickets.md
```

## Process Overview

Read **`PROCESS.md`** for the complete process documentation covering:

1. Philosophy (documented, repeatable, measurable, scalable)
2. All 16+ skills with usage examples
3. 7 path-scoped rules with enforcement details
4. 5 agents with model/tools/permissions
5. Post-commit hook
6. Ticket-first workflow
7. Model tier system (Haiku/Sonnet/Opus)
8. End-to-end workflows (feature dev, bug fix, deployment)
9. Automated task runner (autonextstep.py)
10. Agent offloading best practices
11. Concurrent sessions with git worktrees
12. Directory structure
13. Configuration file formats

## Adapting for Your Stack

The process is stack-agnostic at its core. The skills, ticket workflow, model tiers, and agent patterns work regardless of whether you're building with:

- Python + FastAPI or Node.js + Express
- Next.js or SvelteKit or plain React
- PostgreSQL or MongoDB or SQLite
- Docker or bare metal

What changes is the **content** of each skill and rule — the ports, commands, endpoints, and stack-specific gotchas. The **structure** stays the same.
