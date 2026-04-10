"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Wrench,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RescheduleDialog } from "./RescheduleDialog";

interface SchedulingTaskData {
  id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  reschedule_count: number;
}

export interface ScheduleConfirmationCardProps {
  requestId: string;
  role: "landlord" | "tenant";
  vendorName?: string;
  vendorPhone?: string;
  propertyAddress?: string;
  category?: string;
  description?: string;
  onStatusChange?: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; borderClass: string }
> = {
  confirmed: {
    label: "Confirmed",
    variant: "default",
    borderClass: "border-emerald-200 dark:border-emerald-800",
  },
  rescheduling: {
    label: "Rescheduling Requested",
    variant: "destructive",
    borderClass: "border-orange-200 dark:border-orange-800",
  },
  awaiting_tenant: {
    label: "Pending Tenant Response",
    variant: "secondary",
    borderClass: "border-amber-200 dark:border-amber-800",
  },
  completed: {
    label: "Completed",
    variant: "outline",
    borderClass: "border-muted",
  },
};

const VISIBLE_STATUSES = new Set(["confirmed", "rescheduling", "completed"]);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return m === 0
    ? `${hour12}:00 ${period}`
    : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

function useCountdown(
  dateStr: string | null,
  timeStr: string | null
): { days: number; hours: number; isPast: boolean; isUrgent: boolean } | null {
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    isPast: boolean;
    isUrgent: boolean;
  } | null>(null);

  useEffect(() => {
    if (!dateStr || !timeStr) {
      setCountdown(null);
      return;
    }

    function calc() {
      const [y, mo, d] = dateStr!.split("-").map(Number);
      const [h, m] = timeStr!.split(":").map(Number);
      const appointment = new Date(y, mo - 1, d, h, m);
      const diffMs = appointment.getTime() - Date.now();
      const isPast = diffMs <= 0;
      const totalHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      setCountdown({
        days: Math.floor(totalHours / 24),
        hours: totalHours % 24,
        isPast,
        isUrgent: totalHours < 24 && !isPast,
      });
    }

    calc();
    const interval = setInterval(calc, 60_000);
    return () => clearInterval(interval);
  }, [dateStr, timeStr]);

  return countdown;
}

export function ScheduleConfirmationCard({
  requestId,
  role,
  vendorName,
  vendorPhone,
  propertyAddress,
  category,
  description,
  onStatusChange,
}: ScheduleConfirmationCardProps) {
  const [task, setTask] = useState<SchedulingTaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/scheduling/tasks?requestId=${requestId}`
      );
      if (res.ok) {
        const { task: data } = await res.json();
        setTask(data);
      }
    } catch {
      // Non-fatal — card simply won't render
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const countdown = useCountdown(
    task?.scheduled_date ?? null,
    task?.scheduled_time_start ?? null
  );

  if (loading) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }

  if (!task || !VISIBLE_STATUSES.has(task.status)) {
    return null;
  }

  const config = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.confirmed;
  const hasSchedule =
    task.scheduled_date && task.scheduled_time_start && task.scheduled_time_end;

  const headerTitle =
    role === "tenant" ? "Your Appointment" : "Scheduled Appointment";

  function handleRescheduleComplete() {
    setRescheduleOpen(false);
    fetchTask();
    onStatusChange?.();
  }

  const canReschedule = task.status === "confirmed";

  return (
    <>
      <Card className={`${config.borderClass}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="size-4" />
              {headerTitle}
            </CardTitle>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Date & Time */}
          {hasSchedule && (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CalendarDays className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  {formatDate(task.scheduled_date!)}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  {formatTime(task.scheduled_time_start!)} –{" "}
                  {formatTime(task.scheduled_time_end!)}
                </span>
              </div>
            </div>
          )}

          {/* Countdown */}
          {countdown && !countdown.isPast && hasSchedule && (
            <div
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                countdown.isUrgent
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
              }`}
            >
              {countdown.days > 0
                ? `${countdown.days}d ${countdown.hours}h until appointment`
                : `${countdown.hours}h until appointment`}
            </div>
          )}

          {/* Vendor info (tenant view) */}
          {role === "tenant" && vendorName && (
            <div className="flex items-start gap-2">
              <User className="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-sm">
                <p className="font-medium">{vendorName}</p>
                {vendorPhone && (
                  <p className="text-muted-foreground">{vendorPhone}</p>
                )}
              </div>
            </div>
          )}

          {/* Property address */}
          {propertyAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-sm">{propertyAddress}</span>
            </div>
          )}

          {/* Work order summary */}
          {category && (
            <div className="flex items-start gap-2">
              <Wrench className="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-sm">
                <span className="capitalize font-medium">{category}</span>
                {description && (
                  <p className="text-muted-foreground line-clamp-2 mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Rescheduling notice */}
          {task.status === "rescheduling" && (
            <div className="rounded-md bg-orange-50 dark:bg-orange-950/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="size-4 text-orange-600 dark:text-orange-400" />
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  A reschedule has been requested. The landlord will coordinate
                  a new time.
                </p>
              </div>
            </div>
          )}

          {/* Reschedule button */}
          {canReschedule && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setRescheduleOpen(true)}
            >
              <RefreshCw className="size-3.5 mr-2" />
              Request Reschedule
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reschedule dialog */}
      <RescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        taskId={task.id}
        role={role}
        scheduledDate={task.scheduled_date}
        scheduledTimeStart={task.scheduled_time_start}
        scheduledTimeEnd={task.scheduled_time_end}
        onComplete={handleRescheduleComplete}
      />
    </>
  );
}
