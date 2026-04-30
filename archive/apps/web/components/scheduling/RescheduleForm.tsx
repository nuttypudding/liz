"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MapPin, Wrench, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const QUICK_REASONS = [
  "Scheduling conflict",
  "Emergency repair needed",
  "Equipment unavailable",
  "Other",
];

interface AppointmentDetails {
  category: string;
  address: string;
  scheduledDate: string | null;
  scheduledTimeStart: string | null;
  scheduledTimeEnd: string | null;
  workOrderText: string | null;
}

interface RescheduleFormProps {
  token: string;
  taskId: string;
  appointment: AppointmentDetails;
}

export function RescheduleForm({ token, appointment }: RescheduleFormProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyQuickReason(quick: string) {
    setReason(quick === "Other" ? "" : quick);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reschedule/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason: reason || undefined }),
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
        <h2 className="text-xl font-semibold mb-2">Request Sent</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your reschedule request has been sent to the landlord. They will be in
          touch to arrange a new time.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Appointment summary (read-only) */}
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Wrench className="size-4 text-muted-foreground shrink-0" />
          <span className="font-medium capitalize">{appointment.category}</span>
          <span className="text-muted-foreground">repair</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="size-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">{appointment.address}</span>
        </div>
        {appointment.scheduledDate && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              {appointment.scheduledDate}
              {appointment.scheduledTimeStart && (
                <>
                  {" "}
                  at {appointment.scheduledTimeStart}
                  {appointment.scheduledTimeEnd && ` – ${appointment.scheduledTimeEnd}`}
                </>
              )}
            </span>
          </div>
        )}
        {appointment.workOrderText && (
          <p className="text-sm text-muted-foreground border-t pt-3 mt-1">
            {appointment.workOrderText}
          </p>
        )}
      </Card>

      {/* Reason */}
      <div className="space-y-3">
        <Label htmlFor="reason" className="text-sm font-semibold">
          Reason for rescheduling{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>

        {/* Quick-select reasons */}
        <div className="flex flex-wrap gap-2">
          {QUICK_REASONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => applyQuickReason(q)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors
                ${
                  reason === q || (q === "Other" && reason === "")
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
            >
              {q}
            </button>
          ))}
        </div>

        <Textarea
          id="reason"
          placeholder="Add more details (optional)"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
          maxLength={300}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {reason.length}/300
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
          <AlertCircle className="size-4 mt-0.5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Submit */}
      <Button type="submit" disabled={submitting} className="w-full" size="lg">
        {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
        Send Reschedule Request
      </Button>
    </form>
  );
}
