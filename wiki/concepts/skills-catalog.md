---
type: concept
tags: [process, skills, claude-code]
created: 2026-04-12
updated: 2026-04-12
confidence: high
---

# Skills Catalog

The slash commands Claude Code uses to drive Liz's development. Mirror of the Skills table in `CLAUDE.md`, annotated with what each skill touches.

> **Auto-refresh candidate** — once `/wiki-lint` is live, this page should be regenerated from `CLAUDE.md` + `.claude/skills/**` rather than hand-edited. Until then, keep in sync manually.

## Active skills

| Skill | Purpose | Primary files touched |
|-------|---------|-----------------------|
| `/nextstep` | Pick + execute next backlog task | `features/inprogress/**`, `.claude/feature-lifecycle.json`, git |
| `/plan-feature <name>` | Create feature plan + ticket + branch | `features/planned/**`, `.claude/tickets.md`, git |
| `/create-feature-tasks-in-backlog <name>` | Generate task files from a plan | `features/inprogress/**/backlog/**` |
| `/fix-bug [--ticket T-NNN]` | Ticket-first bug fix workflow | `.claude/tickets.md`, code, tests |
| `/log-bug <description>` | Log a new bug ticket | `.claude/tickets.md` |
| `/update-docs` | Scan diff, update docs | `wiki/project/**` (retargeted from `docs/**`) |
| `/ship <message>` | Tests + doc sweep + commit | git, `wiki/project/**` |
| `/merge-to-main` | Push + PR + merge | git, GitHub |
| `/review-changes` | Security + architecture review (read-only) | — |
| `/autorunner-status` | Autorunner progress | `.claude/feature-lifecycle.json` |
| `/run-dev` | Start local dev servers | dev-only |
| `/test-all` | Run all tests | unit + component + E2E suites |
| `/test-fix-prod` | Autonomous prod smoke + fix loop | `apps/web/e2e-prod/*.mjs`, Vercel |
| `/deploy-prod` | Production deploy to Vercel | Vercel, `.claude/tickets.md` |

## Pending skills

| Skill | Blocker |
|-------|---------|
| `/test-fix-dev` | Autonomous test-fix loop not yet implemented |
| `/overnight-qa` | Needs full test matrix + data-flow verification |
| `/notify` | Needs notification service credentials |

## New wiki skills (planned in P1-Tkt-002)

See [[project/workflow/brightstep-process]] and the feature plan at `features/inprogress/P1-Tkt-002-llm-wiki/README.md`. Upcoming:

- `/ingest <path-or-url>` — Opus; file source, propagate to entity/concept pages
- `/wiki-query <question>` — Opus; cited answers, optional file-back to `synthesis/`
- `/wiki-lint` — Sonnet; orphans, contradictions, stale, index drift
- `/wiki-status` — Sonnet; regenerate [[status]]
- `/wiki-qa-refresh` — Sonnet; regenerate [[qa-queue]]
- `/run-wiki-chat` — Sonnet; launch Streamlit chat app for Liz

## Conventions

- Skills live in `.claude/skills/<name>/SKILL.md` or `.claude/skills/<name>.md`.
- Skill invocation is case-sensitive; trailing arguments are free-form strings.
- See [[concepts/brightstep-process]] for how these compose into the full workflow.
- Tier selection per skill is implicit — most are Sonnet; front-end and architecture skills route to Opus.

## Related

- [[concepts/brightstep-process]] — overall workflow
- [[concepts/model-tier-system]] — when each tier applies
- [[concepts/ticket-lifecycle]] — ticket statuses these skills drive
- [[entities/claude-code-agent]] — the agent that runs these skills
