---
paths:
  - "apps/**/*.tsx"
  - "apps/**/*.ts"
---

# shadcn/ui MCP Workflow Rules

When building or modifying UI in `apps/`, **always** use the shadcn MCP server tools.
Never rely on training data for component APIs — fetch live context every time.

## Rule 1: Always Use the MCP Server

Available MCP tools:
- **Discovery**: `get_project_registries`, `list_items_in_registries`, `search_items_in_registries`
- **Inspection**: `view_items_in_registries`, `get_item_examples_from_registries`
- **Installation**: `get_add_command_for_items`
- **Verification**: `get_audit_checklist`

## Rule 2: Planning Phase (No Code)

When planning UI, produce a structured implementation plan **without writing any code**.

1. Call `search_items_in_registries` to find relevant components and blocks
2. **Prioritize blocks over individual components** — blocks are pre-built composites
3. Call `get_item_examples_from_registries` for each candidate — search for `"{name}-demo"` patterns
4. Output: component hierarchy, block selections, layout structure, files to create/modify

## Rule 3: Implementation Phase

When implementing UI:

1. **Call `get_item_examples_from_registries` FIRST** for every component — prevents implementation errors
2. Call `view_items_in_registries` for full source code when needed
3. Follow the demo patterns exactly when writing code
4. Use `get_add_command_for_items` to get the correct install command for new components

## Rule 4: Post-Implementation Verification

After building components:

1. Call `get_audit_checklist` to get verification steps
2. Verify all dependencies are installed
3. Check that imports resolve correctly
4. Confirm component APIs match the demo patterns
