"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wrench,
  MapPin,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DayPart = "morning" | "afternoon" | "evening";

interface TenantAvailabilityPromptProps {
  taskId: string;
  category: string;
  propertyAddress: string;
  daysAhead?: number;
}

const DAY_PARTS: { key: DayPart; label: string; time: string }[] = [
  { key: "morning", label: "Morning", time: "6 AM – 12 PM" },
  { key: "afternoon", label: "Afternoon", time: "12 PM – 6 PM" },
  { key: "evening", label: "Evening", time: "6 PM – 10 PM" },
];

function getNextDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function dateToStr(date: Date): string {
  const y = date.getFullYear();
  const mo = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function formatDayLabel(date: Date): { dayName: string; dateLabel: string } {
  return {
    dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
    dateLabel: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  };
}

function slotKey(date: string, dayPart: DayPart): string {
  return `${date}|${dayPart}`;
}

function parseSlotKey(key: string): { date: string; dayPart: DayPart } {
  const [date, dayPart] = key.split("|");
  return { date, dayPart: dayPart as DayPart };
}

export function TenantAvailabilityPrompt({
  taskId,
  category,
  propertyAddress,
  daysAhead = 7,
}: TenantAvailabilityPromptProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = getNextDays(daysAhead);

  function toggleSlot(date: string, dayPart: DayPart) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = slotKey(date, dayPart);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setError(null);
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      setError("Please select at least one available time slot.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const availableSlots = Array.from(selected).map((key) => parseSlotKey(key));

    try {
      const res = await fetch("/api/scheduling/tenant-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, availableSlots }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Failed to submit. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12 px-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-4">
          <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Thank you!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          We&apos;ll find the best time for your repair and notify you when the
          appointment is confirmed.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-6"
    >
      {/* Work order context */}
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Wrench className="size-4 text-muted-foreground shrink-0" />
          <span className="font-medium capitalize">{category}</span>
          <span className="text-muted-foreground">repair</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="size-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">{propertyAddress}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="size-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Please confirm your availability in the next {daysAhead} days
          </span>
        </div>
      </Card>

      {/* Day-part grid */}
      <fieldset>
        <legend className="text-sm font-semibold mb-3">
          Select all times you&apos;re available
        </legend>

        {/* Desktop header */}
        <div
          className="hidden sm:grid gap-1.5 mb-1.5"
          style={{ gridTemplateColumns: "minmax(90px, auto) repeat(3, 1fr)" }}
        >
          <div />
          {DAY_PARTS.map((p) => (
            <div
              key={p.key}
              className="text-center text-xs text-muted-foreground font-medium py-1"
            >
              <div>{p.label}</div>
              <div className="text-[10px]">{p.time}</div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 sm:space-y-0">
          {days.map((day) => {
            const dateStr = dateToStr(day);
            const { dayName, dateLabel } = formatDayLabel(day);
            return (
              <div
                key={dateStr}
                className="flex flex-col sm:grid gap-1.5 rounded-lg sm:rounded-none border sm:border-0 p-3 sm:p-0"
                style={{
                  gridTemplateColumns: "minmax(90px, auto) repeat(3, 1fr)",
                }}
              >
                {/* Date label */}
                <div className="flex items-center gap-2 sm:gap-0 sm:flex-col sm:justify-center sm:items-start px-1 py-1 mb-1 sm:mb-0">
                  <span className="text-sm font-medium">{dayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {dateLabel}
                  </span>
                </div>

                {/* Day-part toggles */}
                <div className="grid grid-cols-3 sm:contents gap-1.5">
                  {DAY_PARTS.map((p) => {
                    const key = slotKey(dateStr, p.key);
                    const isSelected = selected.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-label={`${p.label} on ${dayName}, ${dateLabel}`}
                        onClick={() => toggleSlot(dateStr, p.key)}
                        className={`
                          rounded-md border px-2 py-2.5 text-xs font-medium transition-all
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                          ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60 hover:border-primary/30"
                          }
                        `}
                      >
                        {/* Mobile: show label */}
                        <span className="sm:hidden">{p.label}</span>
                        {/* Desktop: show time range */}
                        <span className="hidden sm:inline">{p.time}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
          <AlertCircle className="size-4 mt-0.5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          disabled={submitting || selected.size === 0}
          className="w-full"
          size="lg"
        >
          {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
          Confirm Availability
          {selected.size > 0 && (
            <span className="ml-1.5 text-xs opacity-80">
              ({selected.size} slot{selected.size !== 1 ? "s" : ""})
            </span>
          )}
        </Button>
        {selected.size === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Select at least one time slot to continue
          </p>
        )}
      </div>
    </form>
  );
}
