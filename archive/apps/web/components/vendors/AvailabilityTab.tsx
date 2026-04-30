"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VendorAvailabilityRules } from "@/lib/types/scheduling";

const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
] as const;

type AvailabilityMode = "not_available" | "custom" | "always";

interface DayAvailability {
  mode: AvailabilityMode;
  start_time: string;
  end_time: string;
}

const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
] as const;

function getDefaultTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (COMMON_TIMEZONES.some((t) => t.value === tz)) return tz;
  } catch {
    // fallback
  }
  return "America/New_York";
}

interface AvailabilityTabProps {
  vendorId: string;
}

export function AvailabilityTab({ vendorId }: AvailabilityTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState(getDefaultTimezone);
  const [days, setDays] = useState<Record<number, DayAvailability>>(() => {
    const init: Record<number, DayAvailability> = {};
    for (const day of DAYS) {
      init[day.value] = { mode: "not_available", start_time: "08:00", end_time: "17:00" };
    }
    return init;
  });

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}/availability`);
      if (!res.ok) return;
      const { rules } = (await res.json()) as { rules: VendorAvailabilityRules[] };

      if (rules.length > 0) {
        setTimezone(rules[0].timezone);
        const updated: Record<number, DayAvailability> = {};
        for (const day of DAYS) {
          const rule = rules.find((r) => r.day_of_week === day.value);
          if (rule) {
            const isAllDay =
              rule.start_time === "00:00:00" && rule.end_time === "23:59:00";
            updated[day.value] = {
              mode: isAllDay ? "always" : "custom",
              start_time: rule.start_time.slice(0, 5),
              end_time: rule.end_time.slice(0, 5),
            };
          } else {
            updated[day.value] = { mode: "not_available", start_time: "08:00", end_time: "17:00" };
          }
        }
        setDays(updated);
      }
    } catch {
      toast.error("Failed to load availability");
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  function updateDay(dayValue: number, update: Partial<DayAvailability>) {
    setDays((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], ...update },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const rules: Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
        timezone: string;
      }> = [];

      for (const day of DAYS) {
        const d = days[day.value];
        if (d.mode === "always") {
          rules.push({
            day_of_week: day.value,
            start_time: "00:00",
            end_time: "23:59",
            timezone,
          });
        } else if (d.mode === "custom") {
          if (d.start_time >= d.end_time) {
            toast.error(`${day.label}: end time must be after start time`);
            setSaving(false);
            return;
          }
          rules.push({
            day_of_week: day.value,
            start_time: d.start_time,
            end_time: d.end_time,
            timezone,
          });
        }
      }

      const res = await fetch(`/api/vendors/${vendorId}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });

      if (res.ok) {
        toast.success("Availability saved");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save availability");
      }
    } catch {
      toast.error("Failed to save availability");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="availability-timezone">Timezone</Label>
        <Select value={timezone} onValueChange={(v) => { if (v) setTimezone(v); }}>
          <SelectTrigger id="availability-timezone" className="w-full min-h-11">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Weekly Schedule</Label>
        {DAYS.map((day) => {
          const d = days[day.value];
          return (
            <div key={day.value} className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium w-10 shrink-0">
                  {day.short}
                </span>
                <Select
                  value={d.mode}
                  onValueChange={(v) =>
                    updateDay(day.value, { mode: v as AvailabilityMode })
                  }
                >
                  <SelectTrigger className="w-full min-h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_available">Not Available</SelectItem>
                    <SelectItem value="custom">Custom Hours</SelectItem>
                    <SelectItem value="always">All Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {d.mode === "custom" && (
                <div className="flex items-center gap-2 pl-[52px]">
                  <Clock className="size-3.5 text-muted-foreground shrink-0" />
                  <Input
                    type="time"
                    value={d.start_time}
                    onChange={(e) =>
                      updateDay(day.value, { start_time: e.target.value })
                    }
                    className="min-h-9 w-[120px] text-sm"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={d.end_time}
                    onChange={(e) =>
                      updateDay(day.value, { end_time: e.target.value })
                    }
                    className="min-h-9 w-[120px] text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={saving} className="min-h-11 mt-2">
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {saving ? "Saving..." : "Save Availability"}
      </Button>
    </div>
  );
}
