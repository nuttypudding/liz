"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellIcon,
  CheckCheckIcon,
  DollarSignIcon,
  InboxIcon,
  WrenchIcon,
} from "lucide-react";

import type { Notification, NotificationType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function notificationIcon(type: NotificationType) {
  switch (type) {
    case "rent_due_reminder":
    case "rent_overdue":
    case "rent_paid":
      return <DollarSignIcon className="size-4 shrink-0" />;
    default:
      return <WrenchIcon className="size-4 shrink-0" />;
  }
}

function notificationLink(type: NotificationType): string {
  switch (type) {
    case "rent_due_reminder":
    case "rent_overdue":
    case "rent_paid":
      return "/rent";
    default:
      return "/dashboard";
  }
}

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// NotificationItem
// ---------------------------------------------------------------------------

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string, link: string) => void;
}) {
  const isUnread = notification.read_at === null;
  const link = notificationLink(notification.notification_type);

  return (
    <button
      type="button"
      onClick={() => onRead(notification.id, link)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/80 ${
        isUnread ? "bg-muted/50" : ""
      }`}
    >
      {/* Unread dot */}
      <div className="mt-1.5 flex shrink-0 items-center">
        {isUnread ? (
          <span className="size-2 rounded-full bg-blue-500" />
        ) : (
          <span className="size-2" />
        )}
      </div>

      {/* Icon */}
      <div className="mt-0.5 text-muted-foreground">
        {notificationIcon(notification.notification_type)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{notification.subject}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {notification.body}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {relativeTime(notification.sent_at)}
        </p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// NotificationBell
// ---------------------------------------------------------------------------

const POLL_INTERVAL = 60_000; // 1 minute

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Fetch unread count (lightweight — used for badge)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=true&limit=1");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Silently ignore — bell just shows no badge
    } finally {
      setInitialLoad(false);
    }
  }, []);

  // Fetch full notification list (when sheet opens)
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.data ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full list when sheet opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Mark single notification as read + navigate
  const handleRead = useCallback(
    async (id: string, link: string) => {
      setOpen(false);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } catch {
        // Best-effort — navigation still happens
      }

      router.push(link);
    },
    [router]
  );

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      });
    } catch {
      // Best-effort
    }
  }, []);

  const badgeText = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" />
        }
      >
        <BellIcon className="size-4" />
        {!initialLoad && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold leading-none text-white">
            {badgeText}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </SheetTrigger>

      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <SheetTitle>Notifications</SheetTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground"
            >
              <CheckCheckIcon className="size-3.5" />
              Mark all read
            </Button>
          )}
        </SheetHeader>

        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="mt-1 size-4 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <InboxIcon className="size-10 opacity-40" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {notifications.map((notification, idx) => (
                <div key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onRead={handleRead}
                  />
                  {idx < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
