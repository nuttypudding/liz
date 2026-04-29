---
name: deploy-prod
description: "[PENDING] Deploy to Vercel. Needs Vercel project setup first."
---

# /deploy-prod — Production Deployment

**STATUS: PENDING** — Activate once Vercel project is linked.

## Planned Workflow

1. Run tests (`/test-all`)
2. Build (`npm run build`) — catch errors before deploy
3. If on feature/fix branch: create PR to main, merge
4. If on main: push triggers Vercel auto-deploy
5. Verify deployment at production URL
6. Update ticket status
