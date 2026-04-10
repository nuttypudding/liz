"use client";

import { useState } from "react";
import { Loader2, CalendarDays, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  role: "landlord" | "tenant" | "vendor";
  scheduledDate: string | null;
  scheduledTimeStart: string | null;
  scheduledTimeEnd: string | null;
  onComplete?: () => void;
}

const REASON_PLACEHOLDERS = [
  "Emergency repair needed",
  "Scheduling conflict",
  "Need to arrange access",
  "Waiting for parts",
];

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

export function RescheduleDialog({
  open,
  onOpenChange,
  taskId,
  role,
  scheduledDate,
  scheduledTimeStart,
  scheduledTimeEnd,
  onComplete,
}: RescheduleDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      // Reset state when closing
      setReason("");
      setSubmitted(false);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/scheduling/reschedule/${taskId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim() || undefined,
          requestedBy: role,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        onComplete?.();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to submit reschedule request");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasCurrentAppointment =
    scheduledDate && scheduledTimeStart && scheduledTimeEnd;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          /* Success state */
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">
                Reschedule request submitted
              </p>
              <p className="text-sm text-muted-foreground">
                {role === "landlord"
                  ? "A new time slot can be selected from the scheduling view."
                  : "The landlord will review and coordinate a new time."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          /* Form state */
          <>
            <DialogHeader>
              <DialogTitle>Need to reschedule?</DialogTitle>
              <DialogDescription>
                Submit a reschedule request. The landlord will be notified and
                can select a new time.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Current appointment (read-only) */}
              {hasCurrentAppointment && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Current Appointment
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="size-3.5 text-muted-foreground" />
                    {formatDate(scheduledDate!)}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {formatTime(scheduledTimeStart!)} –{" "}
                    {formatTime(scheduledTimeEnd!)}
                  </div>
                </div>
              )}

              {/* Reason textarea */}
              <div className="space-y-2">
                <label
                  htmlFor="reschedule-reason"
                  className="text-sm font-medium"
                >
                  Reason{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <Textarea
                  id="reschedule-reason"
                  placeholder={
                    REASON_PLACEHOLDERS[
                      Math.floor(Math.random() * REASON_PLACEHOLDERS.length)
                    ]
                  }
                  value={reason}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setReason(e.target.value);
                    }
                  }}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {reason.length}/200
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
                  <AlertCircle className="size-4 mt-0.5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && (
                  <Loader2 className="size-4 animate-spin mr-2" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
