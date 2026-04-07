---
name: ui-build
description: Build dashboard UI components from a UX design plan. Retrieves shadcn/ui code via MCP, writes production TypeScript React. Run AFTER /ux-design.
argument-hint: "<feature name or plan file path>"
---

# UI Build — Implement a Dashboard Feature

Build dashboard UI components from an existing implementation plan. This skill writes production-quality TypeScript React code.

## Step 1: Load the Plan

Read the feature argument from `$ARGUMENTS`. Find the plan:

1. If `$ARGUMENTS` is a file path, read it directly
2. Otherwise, look for `dashboard/plans/<argument>.md`
3. If no plan is found, list available plans:
   ```bash
   ls dashboard/plans/
   ```
   Ask the user which plan to implement, or suggest running `/ux-design` first.

Read the full plan file to understand the feature scope.

## Step 2: Pre-flight Check

Before building, verify the environment:

```bash
ls dashboard/src/components/ui/
```

Cross-reference the plan's "Components Needed" section against installed components. Note which ones need installation.

## Step 3: Build the Feature

Use the **Task tool** with `subagent_type: "ui-builder"` to spawn the UI Builder agent:

> "Implement the following dashboard feature plan:
>
> ```
> <paste full plan content here>
> ```
>
> The dashboard root is `dashboard/`. Follow the project conventions in your instructions.
> Already-installed shadcn components: `<list from Step 2>`.
> Install any missing components before using them."

The agent will:
1. Look up component examples via MCP before using each one
2. Install missing shadcn/ui components
3. Write implementation files following project conventions
4. Wire new components into the app (App.tsx, routes, parent components)
5. Run the shadcn audit checklist

## Step 4: Verify

After the builder agent completes, verify the build:

```bash
cd dashboard && npx tsc --noEmit && cd ..
```

If there are TypeScript errors, fix them before proceeding.

Check that the app compiles:
```bash
cd dashboard && npx vite build 2>&1 | tail -5 && cd ..
```

## Step 5: Report

Tell the user:
- Files created and modified (with paths)
- Components installed
- How to preview: run `/run-dev` to start the dev server
- Suggested next step: run `/ui-refine <component>` to polish visual details
