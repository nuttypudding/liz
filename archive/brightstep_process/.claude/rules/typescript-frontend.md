---
paths:
  - "apps/**/*.ts"
  - "apps/**/*.tsx"
---

# TypeScript Frontend Rules

When editing TypeScript files in `apps/`:

1. **shadcn/ui components first**: Before building a custom component, search the shadcn registry using the MCP tools (`mcp__shadcn__search_items_in_registries`). Use existing shadcn components whenever possible.

2. **Next.js 15 App Router**: Use the App Router (`app/` directory), not Pages Router. Default to React Server Components — only add `"use client"` when the component needs browser APIs, event handlers, or hooks.

3. **Strict TypeScript**: No `any` types. Use proper type annotations. If an external library has poor types, create a local type declaration file in the app's `types/` directory.

4. **Import paths**: Use `@/` alias for imports within an app (maps to the app's `src/` or root). Don't use relative paths that go more than 2 levels up (`../../..`).

5. **Styling**: Use Tailwind CSS utility classes. Don't create custom CSS files unless absolutely necessary. Follow the shadcn/ui theming conventions (CSS variables in `globals.css`).

6. **UI Workflow Agents**: For non-trivial UI work, use the three-phase agent workflow:
   - `ux-designer` — Plan new features (discovers components/blocks via MCP, outputs structured spec, no code)
   - `ui-builder` — Implement from spec (calls `get_item_examples_from_registries` before every component)
   - `ui-refiner` — Polish animations, accessibility, responsive behavior (minimal edits only)
