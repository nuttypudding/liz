---
id: 236
title: "Notifications API routes — GET /api/notifications, PATCH /api/notifications"
tier: Sonnet
depends_on: ["231", "232"]
feature: P2-001-rent-reminder
---

# 236 — Notifications API Routes

## Objective

Implement API routes for listing and updating in-app notifications. These power the notification bell component in the site header.

## Context

The `notifications` table (task 231) stores in-app notifications for both landlords and tenants. Users should only see their own notifications.

An existing notification service may exist in `apps/web/lib/notifications/` — this task builds the API layer, not the service internals.

## Implementation

### `GET /api/notifications`
- Auth: Clerk (any role)
- Query params: `unread` (boolean, optional — filter to unread only), `limit` (number, default 20), `offset` (number, default 0)
- Query `notifications` where `recipient_id = userId`
- Sort by `created_at DESC`
- Return `{ data: Notification[], unread_count: number }` (unread_count is always the total unread, regardless of pagination)

### `PATCH /api/notifications`
- Auth: Clerk (any role)
- Body: `{ id?: string, mark_all_read?: boolean }`
- If `id` provided: mark that single notification as `read = true` (verify ownership)
- If `mark_all_read = true`: update all unread notifications for this user to `read = true`
- Return `{ updated: number }`

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] `GET` returns only the authenticated user's notifications
3. [ ] `GET` supports `unread`, `limit`, `offset` query params
4. [ ] `GET` always returns `unread_count` (total unread, not just current page)
5. [ ] `PATCH` with `id` marks a single notification as read (with ownership check)
6. [ ] `PATCH` with `mark_all_read` marks all user's notifications as read
7. [ ] Returns 401 for unauthenticated requests
8. [ ] All tests pass
