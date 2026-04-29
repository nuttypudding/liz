---
name: brightstep-process
description: Export the full BrightStep development process (skills, rules, agents, hooks, workflows) into a portable brightstep_process/ folder that can be adapted for other projects.
---

# Export BrightStep Development Process

Generate the `brightstep_process/` folder containing all Claude Code configuration, documentation, and templates needed to replicate the BrightStep development workflow in a new project.

## Step 1: Create Directory Structure

```bash
mkdir -p brightstep_process/.claude/{agents,commands,hooks,rules}
mkdir -p brightstep_process/.claude/skills/{fix-bug,log-bug,notify,update-docs,ship,review-changes,test-all,test-fix-dev,test-fix-prod,run-dev,run-arena-dev,deploy-prod,autorunner-status,overnight-qa,brightstep-process}
mkdir -p brightstep_process/scripts
```

## Step 2: Copy All .claude Configuration Files

Copy every config file from the project's `.claude/` directory:

```bash
# Settings
cp .claude/settings.json brightstep_process/.claude/settings.json

# Hook
cp .claude/hooks/post-commit-reminder.sh brightstep_process/.claude/hooks/post-commit-reminder.sh

# Agents (all .md files)
cp .claude/agents/*.md brightstep_process/.claude/agents/

# Rules (all .md files)
cp .claude/rules/*.md brightstep_process/.claude/rules/

# Commands (all .md files)
cp .claude/commands/*.md brightstep_process/.claude/commands/

# Skills (each SKILL.md)
for skill_dir in .claude/skills/*/; do
    skill_name=$(basename "$skill_dir")
    mkdir -p "brightstep_process/.claude/skills/$skill_name"
    cp "$skill_dir/SKILL.md" "brightstep_process/.claude/skills/$skill_name/SKILL.md" 2>/dev/null
done

# Automated task runner script (as reference)
cp scripts/autonextstep.py brightstep_process/scripts/autonextstep.py.reference 2>/dev/null || true
```

## Step 3: Create settings.local.json.example

Create `brightstep_process/.claude/settings.local.json.example` — a template permission allowlist for new projects:

```json
{
  "permissions": {
    "allow": [
      "WebSearch",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git reset:*)",
      "Bash(git status:*)",
      "Bash(docker:*)",
      "Bash(docker ps:*)",
      "Bash(curl:*)",
      "Bash(ls:*)",
      "Bash(echo:*)",
      "Bash(grep:*)",
      "Bash(find:*)",
      "Bash(wc:*)",
      "Bash(jobs:*)",
      "Bash(set:*)",
      "Bash(source:*)",
      "Bash(npm install:*)",
      "Bash(npm uninstall:*)",
      "Bash(npm run build:*)",
      "Bash(npm run dev:*)",
      "Bash(npx:*)",
      "Bash(python3:*)",
      "Bash(python3 -m venv:*)",
      "Bash(.venv/bin/pip install:*)",
      "Bash(.venv/bin/pip list:*)",
      "Bash(.venv/bin/python:*)",
      "Bash(.venv/bin/pytest:*)",
      "Bash(psql:*)",
      "Bash(pg_isready:*)",
      "Bash(redis-cli:*)",
      "mcp__ide__getDiagnostics"
    ]
  }
}
```

## Step 4: Create tickets.md.template

Create `brightstep_process/.claude/tickets.md.template`:

```markdown
# Ticket Tracker

All features and bug fixes are tracked here. Every piece of work starts with a ticket.

## Categories

| Category | Description | Deployment |
|----------|-------------|------------|
| `new-feature` | New functionality | PR-based deploy |
| `bug-fix-dev` | Bug in local dev only | Fix + test locally, no deploy |
| `bug-fix-prod` | Bug in production | Fix → test → PR → deploy → verify |

## Status Lifecycle

`open` → `in-progress` → `testing` → `pr-open` → `deployed` → `closed`

## Open Tickets

| Ticket | Date | Category | Description | Branch | Status | PR | Notes |
|--------|------|----------|-------------|--------|--------|----|-------|

## Closed Tickets

| Ticket | Date | Category | Description | Branch | Status | PR | Notes |
|--------|------|----------|-------------|--------|--------|----|-------|
```

## Step 5: Create claude-md-template.md

Create `brightstep_process/claude-md-template.md` — a CLAUDE.md starter for new projects. Include:

- Project Overview placeholder
- Tech Stack table placeholder
- Development Workflow section referencing all skills, rules, hook
- Ticket-First Workflow section (categories, lifecycle, branch naming)
- Environments table placeholder (local vs production)
- Git Branch Strategy diagram (main, feature/*, fix/*)
- Design Principles: always use venv, always write tests, always update docs

Read the current project `CLAUDE.md` to get the structure right, but replace all BrightStep-specific content with `<!-- Replace with your ... -->` placeholders.

## Step 6: Create PROCESS.md

Create `brightstep_process/PROCESS.md` — the complete standalone process documentation. This is the master reference. Organize into these sections:

1. **Philosophy** — Documented, Repeatable, Measurable, Scalable. Ticket-first, test-first, doc-sync, cost-aware, autonomous-capable, parallel-by-default.

2. **Skills (Slash Commands)** — Table of all 16+ skills grouped by category (Planning & Execution, Development, Testing, Deployment). For each skill: name, purpose, model tier, brief description of what it does. Include detail sections for key skills (/ship, /fix-bug, /review-changes, /test-fix-dev, /test-fix-prod, /update-docs, /overnight-qa).

3. **Rules (Path-Scoped)** — Table of all 7 rules with their paths and key enforcement. Detail the python-backend rule's production lessons (asyncpg, OTEL, httpx, Qwen3 think tags). Detail the task-execution rule's model tier switching.

4. **Agents (Spawnable Subprocesses)** — UI workflow (3-phase: ux-designer → ui-builder → ui-refiner) and chat sample agents (streamlit-chat, gradio-chat). Include model, permissions, maxTurns for each.

5. **Hook** — Post-commit doc reminder. Config location, implementation, always-exit-0 behavior.

6. **Ticket-First Workflow** — Categories, status lifecycle, branch naming, commands.

7. **Model Tier System** — Haiku/Sonnet/Opus classification rules, decision table, cost per task, front-end-is-always-Opus rule.

8. **Workflows (End-to-End)** — Feature development, bug fix (prod), bug fix (dev), doc sweep, production deployment.

9. **Automated Task Runner** — autonextstep.py usage, flags, token costs, pivot support.

10. **Agent Offloading Best Practices** — What to offload (read-only analysis) vs keep in main context (read-write). Parallel agent pattern.

11. **Concurrent Sessions** — Git worktree strategy, ownership boundaries.

12. **Directory Structure** — Full tree showing where everything lives.

13. **Configuration Files** — settings.json, settings.local.json, tickets.md, task file format (YAML frontmatter), feature plan format.

Read `docs/workflow.md` as the primary source for this content — it already documents the full process. Expand and organize it into the sections above.

## Step 7: Create README.md

Create `brightstep_process/README.md` — the setup guide. Include:

1. **What's Inside** — tree view of the folder structure with one-line descriptions
2. **Quick Start — New Project Setup** — numbered steps:
   - Copy `.claude/` to project root
   - Customize CLAUDE.md from template
   - Copy settings.local.json.example → settings.local.json
   - Review and customize skills, rules, agents for your project
   - Create required directories (plan/Backlog, plan/Doing, features/planned, etc.)
   - Initialize ticket tracker from template
   - Git configuration (.gitignore additions, what to commit)
3. **Process Overview** — brief summary pointing to PROCESS.md
4. **Adapting Skills for Your Project** — which skills work as-is vs need edits, which agents need customization

## Step 8: Verify

```bash
echo "=== brightstep_process/ ==="
find brightstep_process -type f | sort
echo ""
echo "Total files: $(find brightstep_process -type f | wc -l)"
echo "Total size: $(du -sh brightstep_process | cut -f1)"
```

Report the file count and size to the user. Expected: ~37 files, ~400-500K.
