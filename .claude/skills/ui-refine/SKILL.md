---
name: ui-refine
description: Polish an existing dashboard UI component. Improves styling, animations, accessibility, and responsive behavior. Minimal, targeted changes only.
argument-hint: "<component name or file path>"
---

# UI Refine — Polish a Dashboard Component

Refine an existing dashboard component with targeted visual and accessibility improvements. This skill makes **minimal, additive changes** — it never removes functionality.

## Step 1: Identify the Target

Read the component argument from `$ARGUMENTS`. Find the component:

1. If `$ARGUMENTS` is a file path, use it directly
2. Otherwise, search for it:
   ```bash
   ls apps/web/components/
   ```
   Match by name (case-insensitive). If ambiguous, ask the user which component to refine.

If no argument was provided, ask the user which component needs polish, or list all available components.

## Step 2: Understand Current State

Read the target component file(s) in full. Note:
- Current styling approach (Tailwind classes, CSS custom properties)
- Interactive states (hover, focus, active, disabled)
- Loading and empty states
- Accessibility attributes (ARIA roles, labels, keyboard handlers)
- Responsive breakpoints in use

Also read `apps/web/app/globals.css` for theme context (CSS custom properties, base styles).

## Step 3: Refine the Component

Use the **Task tool** with `subagent_type: "ui-refiner"` to spawn the UI Refiner agent:

> "Refine the dashboard component at `<file path>`.
>
> Current component code:
> ```tsx
> <paste component source>
> ```
>
> Current theme (index.css custom properties):
> ```css
> <paste relevant CSS custom properties>
> ```
>
> Focus areas: <include any specific requests from $ARGUMENTS, or use defaults below>
> - Smooth transitions and animations
> - Hover/focus/active state polish
> - Loading states and skeletons
> - Accessibility (ARIA, keyboard nav, focus management)
> - Responsive refinements
>
> Rules: minimal changes only, preserve all existing behavior, no new files."

The agent will:
1. Check for updated shadcn/ui patterns via MCP
2. Use Magic MCP for enhancement suggestions
3. Apply targeted styling, animation, and accessibility improvements
4. Keep changes minimal and behavior-preserving

## Step 4: Verify

After the refiner agent completes, verify nothing broke:

```bash
npm run lint --workspace=apps/web
```

If there are TypeScript errors, fix them.

## Step 5: Report

Tell the user:
- What was refined (specific improvements made)
- Files modified (with paths)
- Accessibility improvements added
- How to preview: run `/run-dev` to see the changes
- If further polish is needed, they can run `/ui-refine` again on the same component
