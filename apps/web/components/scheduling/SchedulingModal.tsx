"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Clock,
  Loader2,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ---- Types ----

interface SlotSuggestion {
  date: string;
  timeStart: string;
  timeEnd: string;
  reason: string;
  score: number;
}

interface SchedulingTask {
  id: string;
  request_id: string;
  vendor_id: string;
  tenant_id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  tenant_availability: Array<{ date: string; dayPart: string }> | null;
  reschedule_count: number;
}

interface VendorAvailabilityRule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
}

export interface SchedulingModalProps {
  requestId: string;
  vendorId: string;
  tenantId: string;
  vendorName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed?: () => void;
}

// ---- Helpers ----

const DAY_PART_RANGES: Record<string, { start: number; end: number }> = {
  morning: { start: 480, end: 720 },
  afternoon: { start: 720, end: 1020 },
  evening: { start: 1020, end: 1200 },
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return m === 0
    ? `${hour12} ${period}`
    : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

function dateToStr(date: Date): string {
  const y = date.getFullYear();
  const mo = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function durationLabel(startTime: string, endTime: string): string {
  const mins = timeToMinutes(endTime) - timeToMinutes(startTime);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs === 0) return `${rem} min`;
  if (rem === 0) return `${hrs} hr`;
  return `${hrs} hr ${rem} min`;
}

// 30-min slots from 8:00–18:00
const TIME_SLOTS = (() => {
  const slots: Array<{ start: string; end: string }> = [];
  for (let m = 480; m < 1080; m += 30) {
    slots.push({ start: minutesToTime(m), end: minutesToTime(m + 30) });
  }
  return slots;
})();

type SlotType = "overlap" | "vendor" | "tenant" | "none";

function classifySlot(
  startMin: number,
  endMin: number,
  vendorRanges: Array<{ start: number; end: number }>,
  tenantRanges: Array<{ start: number; end: number }>,
  hasVendorRules: boolean
): SlotType {
  const vendorOk =
    !hasVendorRules ||
    vendorRanges.some((r) => startMin >= r.start && endMin <= r.end);
  const tenantOk = tenantRanges.some(
    (r) => startMin >= r.start && endMin <= r.end
  );

  if (vendorOk && tenantOk) return "overlap";
  if (vendorOk) return "vendor";
  if (tenantOk) return "tenant";
  return "none";
}

// ---- Component ----

export function SchedulingModal({
  requestId,
  vendorId,
  tenantId,
  vendorName,
  open,
  onOpenChange,
  onConfirmed,
}: SchedulingModalProps) {
  const [task, setTask] = useState<SchedulingTask | null>(null);
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([]);
  const [vendorRules, setVendorRules] = useState<VendorAvailabilityRule[]>([]);
  const [noOverlapReason, setNoOverlapReason] = useState<string | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    timeStart: string;
    timeEnd: string;
  } | null>(null);

  // Fetch task (create if needed) and vendor availability
  const loadData = useCallback(async () => {
    setLoadingTask(true);
    setError(null);

    try {
      const [taskRes, availRes] = await Promise.all([
        fetch(`/api/scheduling/tasks?requestId=${requestId}`),
        fetch(`/api/vendors/${vendorId}/availability`).catch(() => null),
      ]);

      if (availRes?.ok) {
        const data = await availRes.json();
        setVendorRules(data.rules ?? []);
      }

      if (taskRes.ok) {
        const { task: existing } = await taskRes.json();
        if (existing) {
          setTask(existing);
          return existing as SchedulingTask;
        }
      }

      // No task found — create one
      const createRes = await fetch("/api/scheduling/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          vendor_id: vendorId,
          tenant_id: tenantId,
        }),
      });

      if (createRes.ok) {
        const { task: created } = await createRes.json();
        setTask(created);
        return created as SchedulingTask;
      }

      setError("Could not load or create scheduling task");
      return null;
    } catch {
      setError("Failed to load scheduling data");
      return null;
    } finally {
      setLoadingTask(false);
    }
  }, [requestId, vendorId, tenantId]);

  // Fetch AI suggestions
  const loadSuggestions = useCallback(async (taskId: string) => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/scheduling/suggest/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setNoOverlapReason(data.noOverlapReason ?? null);
      }
    } catch {
      // Non-fatal — suggestions are helpful but not required
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Load on open
  useEffect(() => {
    if (!open) return;
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setSuggestions([]);
    setNoOverlapReason(null);
    setError(null);

    loadData().then((t) => {
      if (t?.id) loadSuggestions(t.id);
    });
  }, [open, loadData, loadSuggestions]);

  function handleSelectSuggestion(s: SlotSuggestion) {
    setSelectedDate(new Date(s.date + "T12:00:00"));
    setSelectedSlot({
      date: s.date,
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
    });
  }

  function handleSelectTimeSlot(slot: { start: string; end: string }) {
    if (!selectedDate) return;
    setSelectedSlot({
      date: dateToStr(selectedDate),
      timeStart: slot.start,
      timeEnd: slot.end,
    });
  }

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    setSelectedSlot(null);
  }

  async function handleConfirm() {
    if (!task || !selectedSlot) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/scheduling/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          selectedDate: selectedSlot.date,
          selectedTimeStart: selectedSlot.timeStart,
          selectedTimeEnd: selectedSlot.timeEnd,
        }),
      });

      if (res.ok) {
        toast.success("Appointment confirmed! Notifications sent.");
        onOpenChange(false);
        onConfirmed?.();
      } else {
        const { error: msg } = await res.json();
        setError(msg ?? "Failed to confirm appointment");
      }
    } catch {
      setError("Failed to confirm appointment");
    } finally {
      setConfirming(false);
    }
  }

  // Calendar constraints: today + 14 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 14);

  // Availability data for the selected date
  const selectedDateStr = selectedDate ? dateToStr(selectedDate) : null;

  const tenantRanges =
    selectedDateStr && task?.tenant_availability
      ? task.tenant_availability
          .filter((s) => s.date === selectedDateStr)
          .map((s) => DAY_PART_RANGES[s.dayPart])
          .filter(Boolean)
      : [];

  const vendorRangesForDate = selectedDate
    ? vendorRules
        .filter((r) => r.day_of_week === selectedDate.getDay())
        .map((r) => ({
          start: timeToMinutes(r.start_time),
          end: timeToMinutes(r.end_time),
        }))
    : [];

  // Dates with known availability (for calendar dot indicators)
  const highlightDates = new Set<string>();
  if (task?.tenant_availability) {
    for (const s of task.tenant_availability) highlightDates.add(s.date);
  }
  for (const s of suggestions) highlightDates.add(s.date);

  const SLOT_STYLES: Record<SlotType, string> = {
    overlap:
      "bg-teal-100 border-teal-400 text-teal-900 hover:bg-teal-200 dark:bg-teal-900/40 dark:border-teal-600 dark:text-teal-100",
    vendor:
      "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-200",
    tenant:
      "bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200",
    none: "bg-muted/40 border-muted text-muted-foreground/60",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:sm:max-w-[520px] w-full overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarClock className="size-5" />
            Schedule Appointment
          </SheetTitle>
          <SheetDescription>
            {vendorName
              ? `Schedule ${vendorName} for this repair`
              : "Select a time slot for this repair"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          {/* Loading skeleton */}
          {loadingTask && (
            <div className="space-y-3">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-6 w-28 mt-2" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
              <AlertCircle className="size-4 mt-0.5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loadingTask && task && (
            <>
              {/* ---- AI Suggestions ---- */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">AI Suggestions</h3>
                  {loadingSuggestions && (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {loadingSuggestions ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-2">
                    {suggestions.slice(0, 3).map((s, i) => {
                      const isActive =
                        selectedSlot?.date === s.date &&
                        selectedSlot?.timeStart === s.timeStart;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion(s)}
                          className={`w-full text-left rounded-lg border p-3 transition-colors ${
                            isActive
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "hover:border-primary/40 hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {formatDateShort(s.date)}{" "}
                                <span className="text-muted-foreground">
                                  &middot;
                                </span>{" "}
                                {formatTime12(s.timeStart)}–
                                {formatTime12(s.timeEnd)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {s.reason}
                              </p>
                            </div>
                            <Badge
                              variant={
                                s.score >= 80
                                  ? "default"
                                  : s.score >= 50
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="shrink-0"
                            >
                              {s.score}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : noOverlapReason ? (
                  <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3">
                    {noOverlapReason}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3">
                    No AI suggestions available. Select a date manually below.
                  </p>
                )}
              </section>

              {/* ---- Date Picker ---- */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Select Date</h3>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => {
                      const d = new Date(date);
                      d.setHours(0, 0, 0, 0);
                      return d < today || d > maxDate;
                    }}
                    modifiers={{
                      hasAvailability: (date: Date) =>
                        highlightDates.has(dateToStr(date)),
                    }}
                    modifiersClassNames={{
                      hasAvailability: "bg-primary/10 font-medium",
                    }}
                  />
                </div>
              </section>

              {/* ---- Time Slot Grid ---- */}
              {selectedDate && selectedDateStr && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">
                      {formatDateShort(selectedDateStr)}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="size-2.5 rounded-sm bg-emerald-200 border border-emerald-400" />
                        Vendor
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-2.5 rounded-sm bg-blue-200 border border-blue-400" />
                        Tenant
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-2.5 rounded-sm bg-teal-300 border border-teal-500" />
                        Both
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {TIME_SLOTS.map((slot) => {
                      const startMin = timeToMinutes(slot.start);
                      const endMin = timeToMinutes(slot.end);
                      const type = classifySlot(
                        startMin,
                        endMin,
                        vendorRangesForDate,
                        tenantRanges,
                        vendorRules.length > 0
                      );
                      const isActive =
                        selectedSlot?.date === selectedDateStr &&
                        selectedSlot?.timeStart === slot.start;

                      return (
                        <button
                          key={slot.start}
                          type="button"
                          disabled={type === "none"}
                          onClick={() => handleSelectTimeSlot(slot)}
                          className={`rounded-md border px-1 py-1.5 text-xs font-medium transition-all ${
                            SLOT_STYLES[type]
                          } ${
                            isActive ? "ring-2 ring-primary ring-offset-1" : ""
                          } ${type === "none" ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        >
                          {formatTime12(slot.start)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected slot summary */}
                  {selectedSlot && (
                    <div className="mt-3 flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                      <Clock className="size-4 text-primary shrink-0" />
                      <span className="text-sm font-medium">
                        {formatTime12(selectedSlot.timeStart)}–
                        {formatTime12(selectedSlot.timeEnd)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        (
                        {durationLabel(
                          selectedSlot.timeStart,
                          selectedSlot.timeEnd
                        )}
                        )
                      </span>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>

        {/* ---- Footer ---- */}
        <SheetFooter>
          <Button
            onClick={handleConfirm}
            disabled={!selectedSlot || confirming}
            className="w-full"
          >
            {confirming && <Loader2 className="size-4 animate-spin mr-2" />}
            Confirm &amp; Notify
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Skip Scheduling
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
