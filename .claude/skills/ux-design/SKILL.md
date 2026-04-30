---
name: ux-design
description: Plan a new dashboard UI feature. Discovers shadcn/ui components, outputs a structured implementation plan with no code. Run BEFORE /ui-build.
argument-hint: "<feature description>"
---

# UX Design — Plan a Dashboard Feature

Design a structured implementation plan for a new dashboard UI feature. This skill produces **plans only** — no code.

## Step 1: Understand the Feature

Read the feature description from `$ARGUMENTS`. If no description was provided, ask the user what they want to build.

Gather context:
- What problem does this feature solve?
- Who is the target user?
- Are there existing patterns in the web app to follow?

## Step 2: Explore Existing Patterns

Read existing web app components to understand current conventions:

```bash
ls apps/web/components/
ls apps/web/components/ui/
```

Skim 2-3 representative components to understand the code style, state management, and layout patterns already in use.

## Step 3: Plan the Feature

Use the **Task tool** with `subagent_type: "ux-designer"` to spawn the UX Designer agent:

> "Plan a dashboard UI feature: `<feature description from $ARGUMENTS>`.
> The web app is at `apps/web/`. Existing components are in `apps/web/components/`.
> Installed shadcn/ui primitives are in `apps/web/components/ui/`.
> Output a structured implementation plan following the template in your instructions."

The agent will:
1. Discover available shadcn/ui components and blocks via MCP
2. Search for relevant blocks (dashboard patterns, layouts, etc.)
3. Inspect component examples to understand APIs and props
4. Check existing dashboard patterns for consistency
5. Produce a structured plan with component hierarchy, layout, data flow, accessibility, and responsive behavior

## Step 4: Save the Plan

Write the agent's plan output to `apps/web/plans/<feature-name>.md` so it can be referenced by `/ui-build`.

```
apps/web/plans/<feature-name>.md
```

Create the `apps/web/plans/` directory if it doesn't exist.

## Step 5: Report

Tell the user:
- Plan saved to `apps/web/plans/<feature-name>.md`
- Summary of key decisions (component choices, layout approach)
- Any open questions or alternatives worth discussing
- Next step: run `/ui-build <feature-name>` to implement
