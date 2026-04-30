---
paths:
  - "docs/**"
---

# Documentation Rules

When editing files in `docs/`:

1. **Cross-reference consistency**: If you change a port number, service name, or CLI command in a doc, verify it matches:
   - `infrastructure/docker-compose.yml` (ports, container names)
   - `.env.example` (environment variables)
   - `src/brightstep/cli/main.py` (CLI command names, flags, descriptions)
   - Other docs that reference the same value

2. **Port map accuracy**: The port map in `docs/runbook.md` must match what's actually configured in `docker-compose.yml` and `.env.example`. If you change a port anywhere, update all three.

3. **CLI examples must be runnable**: Every `brightstep <command>` example in docs must match the actual CLI defined in `src/brightstep/cli/main.py`. If a flag doesn't exist, don't document it.

4. **Link validity**: Internal links between docs (e.g., `[runbook](runbook.md)`) must point to files that exist. Check with a glob if unsure.

5. **No stale references**: If a feature is marked COMPLETE or IMPLEMENTED in the plan, docs should reflect current behavior, not planned behavior.
