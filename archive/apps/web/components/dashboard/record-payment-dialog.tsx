"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RecordPaymentDialogProps {
  propertyId: string;
  monthlyRent: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function computePeriod(dateStr: string): { periodStart: string; periodEnd: string } {
  const [year, month] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    periodStart: start.toISOString().split("T")[0],
    periodEnd: end.toISOString().split("T")[0],
  };
}

export function RecordPaymentDialog({
  propertyId,
  monthlyRent,
  open,
  onOpenChange,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState(String(monthlyRent));
  const [paidAt, setPaidAt] = useState(todayIso());
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const t = todayIso();
      const { periodStart: ps, periodEnd: pe } = computePeriod(t);
      setAmount(String(monthlyRent));
      setPaidAt(t);
      setPeriodStart(ps);
      setPeriodEnd(pe);
      setNotes("");
      setErrors({});
    }
  }, [open, monthlyRent]);

  function handleDateChange(value: string) {
    setPaidAt(value);
    if (value) {
      const { periodStart: ps, periodEnd: pe } = computePeriod(value);
      setPeriodStart(ps);
      setPeriodEnd(pe);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) errs.amount = "Amount must be a positive number";
    if (!paidAt) errs.paidAt = "Date is required";
    else if (paidAt > todayIso()) errs.paidAt = "Date cannot be in the future";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/rent-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          paid_at: paidAt,
          period_start: periodStart,
          period_end: periodEnd,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to record payment");
        return;
      }
      toast.success("Payment recorded");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Rent Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="rp-amount">Amount ($)</Label>
            <Input
              id="rp-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-paid-at">Payment Date</Label>
            <Input
              id="rp-paid-at"
              type="date"
              value={paidAt}
              max={todayIso()}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            {errors.paidAt && (
              <p className="text-xs text-destructive">{errors.paidAt}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rp-period-start">Period Start</Label>
              <Input
                id="rp-period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-period-end">Period End</Label>
              <Input
                id="rp-period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-notes">Notes (optional)</Label>
            <Textarea
              id="rp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid by check #1234"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
