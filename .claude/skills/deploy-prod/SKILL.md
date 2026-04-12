---
name: deploy-prod
description: "Deploy to Vercel production."
---

# /deploy-prod — Production Deployment

## Working Directory

`apps/web/`

## Vercel Project

| Key | Value |
|-----|-------|
| Project ID | `prj_DnDSbfQ2y0gh4EAG06PPbfKQsCiB` |
| Production URL | `https://web-lovat-sigma-36.vercel.app` |
| Env Vars | Managed in Vercel Dashboard |

## Steps

1. **Run tests** — Execute `/test-all`. Abort if any failures.
2. **Build** — Run `npm run build` from `apps/web/` to catch build errors before deploy.
3. **Deploy** — Run `vercel --prod` from `apps/web/`. This pushes to production.
4. **Verify** — Curl the production URL to confirm the deployment is live.
5. **Update tickets** — Identify tickets associated with deployed commits (via branch name or commit messages referencing `T-NNN`). Transition each from `pr-open` or `testing` → `deployed` in `.claude/tickets.md`.
6. **Refresh wiki views** — Invoke `/wiki-qa-refresh` (updates `qa-queue.md` with the prod URL for Liz). Invoke `/wiki-status` (prod deploys are meaningful project state).
7. **Log** — Append to `wiki/log.md`:
   ```
   ## [YYYY-MM-DD] deploy | <prod-url>
   - Tickets deployed: T-NNN, T-MMM
   - Build status: ok
   ```
8. **Report** — Print the deployment URL, tickets transitioned, and build status.

## Notes

- Environment variables (Supabase, Clerk, Claude API keys) are configured in the Vercel dashboard, not in local `.env` files.
- If on a feature/fix branch, consider creating a PR to main first — merging to main triggers Vercel auto-deploy as an alternative to `vercel --prod`.
- Always confirm with the user before deploying.
