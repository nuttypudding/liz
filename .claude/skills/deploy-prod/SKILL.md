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
5. **Report** — Print the deployment URL and build status.

## Notes

- Environment variables (Supabase, Clerk, Claude API keys) are configured in the Vercel dashboard, not in local `.env` files.
- If on a feature/fix branch, consider creating a PR to main first — merging to main triggers Vercel auto-deploy as an alternative to `vercel --prod`.
- Always confirm with the user before deploying.
