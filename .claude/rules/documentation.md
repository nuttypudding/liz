---
paths:
  - "docs/**"
---

# Documentation Rules

When editing files in `docs/`:

1. **Cross-reference consistency**: If you change a port number, service name, API endpoint, or CLI command in a doc, verify it matches:
   - Configuration files (`.env.example`, `docker-compose.yml`, etc.)
   - Source code that defines those values
   - Other docs that reference the same value

2. **Examples must be runnable**: Every command example in docs must work when copy-pasted. If a flag or endpoint doesn't exist, don't document it.

3. **Link validity**: Internal links between docs must point to files that exist.

4. **No stale references**: If a feature is marked COMPLETE in the plan, docs should reflect current behavior, not planned behavior.

5. **Intake schema accuracy**: If the intake JSON schema changes, update both `CLAUDE.md` and any schema docs to match.
