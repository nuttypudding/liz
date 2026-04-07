# UI Development Process

How to design, build, and polish dashboard UI features using the three-phase UI skill pipeline.

## Overview

The dashboard UI workflow uses three specialized skills that run in sequence:

| Phase | Skill | Agent | Purpose |
|-------|-------|-------|---------|
| 1. Plan | `/ux-design` | `ux-designer` | Discover components, design the layout, output a structured plan |
| 2. Build | `/ui-build` | `ui-builder` | Install components, write production code, wire into the app |
| 3. Polish | `/ui-refine` | `ui-refiner` | Improve styling, animations, accessibility, responsive behavior |

Each skill spawns a dedicated agent via the Task tool. Agents have access to **shadcn/ui MCP** (component registry) and **Magic MCP** (design inspiration and refinement).

## Quick Start

```
/ux-design sidebar navigation with collapsible sections
/ui-build sidebar-navigation
/ui-refine SidebarNav
```

That's it. Three commands to go from idea to polished component.

## Detailed Workflow

### Phase 1: Plan with `/ux-design`

**When to use**: You have a feature idea and need a plan before writing code.

**What it does**:
1. Spawns the `ux-designer` agent (read-only, plan mode)
2. Agent discovers available shadcn/ui components and blocks via MCP
3. Agent inspects component examples to understand APIs and props
4. Agent checks existing dashboard patterns for consistency
5. Outputs a structured plan and saves it to `dashboard/plans/<feature>.md`

**Example**:
```
/ux-design test results dashboard with filterable grid, status badges, and trend chart
```

**Plan output includes**:
- Component hierarchy (parent-child nesting)
- Blocks to use (pre-built shadcn patterns)
- Individual components needed (installed vs. needs install)
- Layout structure (responsive strategy)
- Data flow (props, state, API integration)
- Files to create and modify
- Accessibility requirements
- Responsive behavior (mobile/tablet/desktop)

**Agent details**:
- Model: Sonnet
- Permission mode: Plan (read-only)
- Max turns: 15
- Tools: Read, Glob, Grep, Bash
- MCP: shadcn, magic

### Phase 2: Build with `/ui-build`

**When to use**: You have a plan from `/ux-design` (or a manually written plan) and want to implement it.

**What it does**:
1. Reads the plan from `dashboard/plans/<feature>.md`
2. Spawns the `ui-builder` agent (full write access)
3. Agent installs missing shadcn/ui components
4. Agent writes TypeScript React code following project conventions
5. Agent wires new components into the app
6. Verifies TypeScript compilation passes

**Example**:
```
/ui-build test-results-dashboard
```

Or with a direct path:
```
/ui-build dashboard/plans/test-results-dashboard.md
```

**Agent follows these conventions**:
- Named exports only (no `export default`)
- TypeScript interfaces for all props
- `cn()` from `@/lib/utils` for className merging
- No `any` types
- `lucide-react` for icons
- Strict import order: React > external > ui > components > lib > relative > types

**Agent details**:
- Model: Sonnet
- Permission mode: Bypass (full write access)
- Max turns: 30
- Tools: Read, Write, Edit, MultiEdit, Bash, Glob, Grep
- MCP: shadcn, magic

### Phase 3: Polish with `/ui-refine`

**When to use**: A component is functional but needs visual polish, better accessibility, or responsive improvements.

**What it does**:
1. Reads the target component in full
2. Spawns the `ui-refiner` agent (edit-only, no new files)
3. Agent checks for updated shadcn/ui patterns
4. Agent uses Magic MCP for enhancement suggestions
5. Applies targeted improvements without removing functionality

**Example**:
```
/ui-refine TestGrid
```

Or with a direct path:
```
/ui-refine dashboard/src/components/TestGrid.tsx
```

**Refinement focus areas**:
- Smooth transitions and animations (`transition-*`, `animate-*`)
- Hover, focus, active, and disabled states
- Loading states and skeleton screens
- Accessibility (ARIA attributes, keyboard navigation, focus management)
- Responsive refinements
- Color contrast and theming consistency

**Agent details**:
- Model: Sonnet
- Permission mode: Bypass (edit access)
- Max turns: 15
- Tools: Read, Edit, MultiEdit, Glob, Grep (no Write — cannot create files)
- MCP: shadcn, magic

## Common Patterns

### Full feature development

```
/ux-design <feature description>      # Plan
# Review the plan in dashboard/plans/
/ui-build <feature-name>              # Build
/run-dev                               # Preview
/ui-refine <ComponentName>            # Polish
/ui-refine <AnotherComponent>         # Polish more components
/review-changes                        # Security & architecture review
/ship "feat: add <feature>"           # Test, docs, commit
```

### Iterative refinement

Run `/ui-refine` multiple times on the same component. Each pass is additive — the agent reads the current state and improves from there.

```
/ui-refine TestGrid                    # First pass: transitions, hover states
/ui-refine TestGrid                    # Second pass: accessibility audit
/ui-refine TestGrid                    # Third pass: responsive polish
```

### Building without a plan

If you have a clear mental model and don't need discovery, you can write a plan manually and go straight to build:

```markdown
<!-- dashboard/plans/my-feature.md -->
## Feature: My Feature
### Components Needed
- @shadcn/button: Primary action — installed
- @shadcn/dialog: Confirmation modal — needs install
### Files to Create
- dashboard/src/components/MyFeature.tsx
```

Then:
```
/ui-build my-feature
```

### Refining without building

`/ui-refine` works on any existing component — it doesn't require `/ux-design` or `/ui-build` to have been used. Use it to polish components built manually or in previous sessions.

## File Locations

| Artifact | Path |
|----------|------|
| UX Designer agent definition | `.claude/agents/ux-designer.md` |
| UI Builder agent definition | `.claude/agents/ui-builder.md` |
| UI Refiner agent definition | `.claude/agents/ui-refiner.md` |
| `/ux-design` skill | `.claude/skills/ux-design/SKILL.md` |
| `/ui-build` skill | `.claude/skills/ui-build/SKILL.md` |
| `/ui-refine` skill | `.claude/skills/ui-refine/SKILL.md` |
| Feature plans | `dashboard/plans/*.md` |
| Dashboard components | `dashboard/src/components/` |
| shadcn/ui primitives | `dashboard/src/components/ui/` |
| Theme / CSS vars | `dashboard/src/index.css` |

## MCP Dependencies

Both the `shadcn` and `magic` MCP servers must be configured for the agents to discover and retrieve components. The agents use these MCP tools:

**shadcn MCP**:
- `get_project_registries` — list configured registries
- `list_items_in_registries` — browse all available components
- `search_items_in_registries` — find components by query
- `get_item_examples_from_registries` — inspect usage patterns and props
- `view_items_in_registries` — get full source code
- `get_add_command_for_items` — get install commands
- `get_audit_checklist` — post-build verification

**magic MCP**:
- `21st_magic_component_inspiration` — design references for novel patterns
- `21st_magic_component_builder` — generate custom components not in shadcn
- `21st_magic_component_refiner` — enhancement suggestions for existing components

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `/ui-build` can't find the plan | Check `dashboard/plans/` — file name must match the argument |
| Agent can't install components | Run `cd dashboard && npm install` first |
| TypeScript errors after build | Run `cd dashboard && npx tsc --noEmit` to see errors, then fix manually or re-run `/ui-build` |
| MCP tools not available | Verify `shadcn` and `magic` MCP servers are configured in `.claude/settings.json` or project config |
| Refiner removes functionality | Report as a bug — the refiner is constrained to additive changes only |
