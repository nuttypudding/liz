---
id: 237
title: "Cron job endpoint — POST /api/cron/rent-reminders + vercel.json config"
tier: Sonnet
depends_on: ["231", "232", "236"]
feature: P2-001-rent-reminder
---

# 237 — Cron Job: Rent Reminders

## Objective

Implement the `POST /api/cron/rent-reminders` endpoint that runs daily via Vercel Cron to transition rent statuses and create notification entries.

## Context

This is the automated backbone of the rent reminder system. It runs daily at 6:00 AM UTC, protected by `CRON_SECRET`. See the feature plan's "Cron Job" section for the full specification.

## Implementation

### `POST /api/cron/rent-reminders`
- **Auth**: Verify `Authorization: Bearer <CRON_SECRET>` header (not Clerk — this is a server-to-server call)
- **Step 1 — Status transitions**:
  - `upcoming` → `due`: where `due_date <= today`
  - `due` → `overdue`: where `due_date < today`
- **Step 2 — Reminder notifications** (insert into `notifications` table):
  - "Rent due in 3 days": `upcoming` periods where `due_date = today + 3 days`. Recipient: tenant.
  - "Rent due today": `due` periods where `due_date = today`. Recipient: tenant.
  - "Rent overdue": newly overdue periods (check `updated_at` to avoid re-notifying). Recipient: tenant.
- **Step 3 — Landlord summary**: For landlords with overdue tenants, create one summary notification: "X tenants have overdue rent." Recipient: landlord.
- **Preferences**: Check `landlord_profiles.notify_rent_reminders` — skip notification creation for landlords who opted out. (Status transitions still happen regardless.)
- **Idempotency**: Use `related_id` + `type` + date to avoid duplicate notifications on re-runs.

### `vercel.json`
- Add cron configuration:
  ```json
  {
    "crons": [
      { "path": "/api/cron/rent-reminders", "schedule": "0 6 * * *" }
    ]
  }
  ```

### Environment
- Add `CRON_SECRET` to `.env.local` (for local testing) and document that it needs to be set in Vercel.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Endpoint rejects requests without valid `CRON_SECRET`
3. [ ] `upcoming` → `due` transition works for periods where `due_date <= today`
4. [ ] `due` → `overdue` transition works for periods where `due_date < today`
5. [ ] "Due in 3 days" notifications created for correct periods
6. [ ] "Due today" notifications created for correct periods
7. [ ] "Overdue" notifications created for newly overdue periods
8. [ ] Landlord summary notification created when overdue tenants exist
9. [ ] Respects `notify_rent_reminders = false` preference
10. [ ] No duplicate notifications on re-runs
11. [ ] `vercel.json` updated with cron schedule
12. [ ] All tests pass
