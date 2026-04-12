---
type: concept
tags: [process, workflow, ai, cost, brightstep, model-tier]
created: 2026-04-12
updated: 2026-04-12
confidence: high
---

# Model Tier System

The BrightStep model tier system controls AI cost by matching task complexity to the appropriate Claude model. Every task file encodes the required tier in its filename prefix.

## Tiers

| Tier | Filename Prefix | Model | Use For |
|------|----------------|-------|---------|
| Haiku | `Haiku-` | Claude Haiku | Routine: config, tests, docs, scaffolding, migrations |
| Sonnet | `Sonnet-` | Claude Sonnet | Guided implementation with a clear design |
| Opus | `Opus-` | Claude Opus | Architecture, novel judgment, all front-end work |

## The Front-End Rule

**All front-end work is always Opus**, regardless of apparent simplicity. UI design requires aesthetic judgment, accessibility reasoning, and consistency with the existing design system — capabilities that require the highest-tier model.

## Filename Convention

Task files follow this naming pattern:

```
{id:03d}-{Tier}-{kebab-case-title}.md
```

Examples:
- `045-Haiku-add-migration-add-units-table.md`
- `087-Sonnet-wire-intake-api-to-supabase.md`
- `112-Opus-design-maintenance-dashboard-layout.md`

The tier prefix is the **first acceptance criterion** on every task: the executor must verify they are aware of the correct model tier before starting work.

## Cost Rationale

Haiku is significantly cheaper than Sonnet, which is significantly cheaper than Opus. Most infrastructure and scaffolding tasks are Haiku. Implementation tasks with a defined spec are Sonnet. Only tasks requiring open-ended design judgment use Opus. This keeps the automated runner (`autonextstep.py`) cost-efficient for batch execution.

## Automated Runner Integration

The `autonextstep.py` runner selects tasks from `backlog/` and executes them. The tier prefix signals which model to invoke. Running `--dry-run` previews the task queue and tier distribution before committing cost.

## Related

- [[decisions/2026-04-01-adopt-brightstep-process]] — adoption of the BrightStep workflow that defines this system
- [[project/workflow/brightstep-process]] — full process reference including tier definitions
- [[concepts/feature-branch-lifecycle]] — how tasks are organized within features
