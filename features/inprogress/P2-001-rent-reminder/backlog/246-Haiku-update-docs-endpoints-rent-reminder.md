---
id: 246
title: "Update docs/endpoints.md with all new routes and pages"
tier: Haiku
depends_on: ["231", "232", "233", "234", "235", "236", "237", "238", "239", "240", "241", "242", "243", "244", "245"]
feature: P2-001-rent-reminder
---

# 246 — Update Documentation: Endpoints and Pages

## Objective

Update `docs/endpoints.md` with all new API routes, app pages, and cron endpoints added by the Rent Reminder feature.

## Context

Per project conventions, `docs/endpoints.md` must be updated whenever routes or pages are added. This task runs last to capture everything.

## Implementation

1. Read `docs/endpoints.md` to understand the current format.

2. Add the following new entries:

### API Routes
- `GET /api/rent` — List rent periods for landlord (filterable)
- `PATCH /api/rent/[id]` — Update rent period (mark paid)
- `POST /api/rent/generate` — Generate rent periods for a month
- `GET /api/tenant/rent` — List rent periods for authenticated tenant
- `GET /api/dashboard/rent-summary` — Aggregated rent stats
- `GET /api/notifications` — List notifications for user
- `PATCH /api/notifications` — Mark notifications as read
- `POST /api/cron/rent-reminders` — Daily cron: status transitions + notifications

### App Pages
- `/(landlord)/rent` — Rent Schedule page
- `/(tenant)/rent` — Tenant Rent View page

### Cron Jobs
- `/api/cron/rent-reminders` — Daily at 6:00 AM UTC

3. Also run `/update-docs` to catch any other documentation that needs updating.

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] All 8 new API routes documented in endpoints.md
3. [ ] Both new app pages documented
4. [ ] Cron job documented with schedule
5. [ ] Format matches existing entries in the file
6. [ ] All tests pass
