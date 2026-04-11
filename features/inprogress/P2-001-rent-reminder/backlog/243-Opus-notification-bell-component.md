---
id: 243
title: "Build Notification Bell component — bell icon, sheet, notification list"
tier: Opus
depends_on: ["236"]
feature: P2-001-rent-reminder
---

# 243 — Build Notification Bell Component

## Objective

Build a `NotificationBell` component for the site header showing an unread count badge and a slide-out notification sheet.

## Context

This is a global component added to the `SiteHeader` (both landlord and tenant layouts). Data comes from `GET /api/notifications` and `PATCH /api/notifications` (task 236).

See the feature plan's **Screen 6: Notification Bell** for the full component hierarchy.

## Implementation

### Components to Build

1. **`NotificationBell`** — `apps/web/components/layout/notification-bell.tsx`
   - Bell icon button (ghost variant, icon size)
   - Unread badge: absolute positioned red dot with count (max "9+")
   - On mount: fetch `GET /api/notifications?unread=true&limit=1` for unread count
   - On click: open Sheet from right, fetch full notification list

2. **`NotificationItem`** — individual notification row
   - Icon based on type (DollarSign for rent, Wrench for maintenance)
   - Title, body, relative time ("2h ago")
   - Highlighted background (bg-muted/50) if unread
   - Blue unread dot indicator
   - Click navigates to `notification.link` and marks as read

3. **Sheet content**
   - Header: "Notifications" title + "Mark all read" button
   - ScrollArea with NotificationItem list
   - Empty state when no notifications

### Integration
- Add `NotificationBell` to `SiteHeader` component (find it in `components/layout/`)
- Position before the user menu / profile button

### shadcn/ui Components

button, sheet, scroll-area, separator, badge, skeleton

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Bell icon appears in site header on all pages
3. [ ] Unread badge shows correct count (caps at "9+")
4. [ ] Clicking bell opens Sheet with notification list
5. [ ] Unread notifications have highlighted background and blue dot
6. [ ] Clicking a notification navigates to its link and marks as read
7. [ ] "Mark all read" clears all unread indicators
8. [ ] Empty state when no notifications
9. [ ] Works in both landlord and tenant layouts
10. [ ] All tests pass
