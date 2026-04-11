"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RentToolbar } from "@/components/rent/rent-toolbar";
import { RentStatusSummaryBar } from "@/components/rent/rent-status-summary-bar";
import { RentTable } from "@/components/rent/rent-table";
import { RentCardList } from "@/components/rent/rent-card-list";
import { MarkPaidDialog } from "@/components/rent/mark-paid-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Property, RentPeriod, Tenant } from "@/lib/types";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function matchesMonth(period: RentPeriod, month: string): boolean {
  return period.lease_start.startsWith(month);
}

export default function RentSchedulePage() {
  const [periods, setPeriods] = useState<RentPeriod[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth);
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [markPaidPeriod, setMarkPaidPeriod] = useState<RentPeriod | null>(null);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rentRes, propsRes] = await Promise.all([
        fetch("/api/rent"),
        fetch("/api/properties"),
      ]);

      if (rentRes.ok) {
        const { data } = await rentRes.json();
        setPeriods(data ?? []);
      }
      if (propsRes.ok) {
        const { properties: data } = await propsRes.json();
        setProperties(data ?? []);
      }
    } catch {
      toast.error("Failed to load rent data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>();
    for (const p of properties) map.set(p.id, p);
    return map;
  }, [properties]);

  const tenantMap = useMemo(() => {
    const map = new Map<string, Tenant>();
    for (const p of properties) {
      for (const t of p.tenants ?? []) {
        map.set(t.id, t);
      }
    }
    return map;
  }, [properties]);

  const monthPeriods = useMemo(
    () => periods.filter((p) => matchesMonth(p, month)),
    [periods, month]
  );

  const filtered = useMemo(() => {
    return monthPeriods.filter((p) => {
      if (propertyFilter !== "all" && p.property_id !== propertyFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [monthPeriods, propertyFilter, statusFilter]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/rent/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      if (res.ok) {
        const { created } = await res.json();
        toast.success(`Generated ${created} rent period${created !== 1 ? "s" : ""}`);
        await fetchData();
      } else {
        const { error } = await res.json();
        toast.error(error ?? "Failed to generate rent periods");
      }
    } catch {
      toast.error("Failed to generate rent periods");
    } finally {
      setGenerating(false);
    }
  }

  function handleMarkPaid(period: RentPeriod) {
    setMarkPaidPeriod(period);
    setMarkPaidOpen(true);
  }

  async function handleConfirmPayment(data: {
    amount_paid: number;
    paid_date: string;
    payment_notes: string;
  }) {
    if (!markPaidPeriod) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/rent/${markPaidPeriod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Payment recorded");
        setMarkPaidOpen(false);
        setMarkPaidPeriod(null);
        await fetchData();
      } else {
        const { error } = await res.json();
        toast.error(error ?? "Failed to record payment");
      }
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Rent Schedule" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const showGenerate = monthPeriods.length === 0 && properties.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Rent Schedule" />

      <RentToolbar
        month={month}
        onMonthChange={setMonth}
        properties={properties}
        propertyFilter={propertyFilter}
        onPropertyFilterChange={setPropertyFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        showGenerate={showGenerate}
        generating={generating}
        onGenerate={handleGenerate}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={showGenerate ? "No rent periods for this month" : "No matching rent periods"}
          description={
            showGenerate
              ? "Generate rent periods for your properties to start tracking payments."
              : "Try adjusting the month or filters."
          }
        />
      ) : (
        <>
          <RentStatusSummaryBar periods={filtered} />

          {/* Desktop: table */}
          <div className="hidden lg:block">
            <RentTable
              periods={filtered}
              propertyMap={propertyMap}
              tenantMap={tenantMap}
              onMarkPaid={handleMarkPaid}
            />
          </div>

          {/* Mobile: card list */}
          <div className="lg:hidden">
            <RentCardList
              periods={filtered}
              propertyMap={propertyMap}
              tenantMap={tenantMap}
              onMarkPaid={handleMarkPaid}
            />
          </div>
        </>
      )}

      <MarkPaidDialog
        period={markPaidPeriod}
        open={markPaidOpen}
        onOpenChange={(open) => {
          setMarkPaidOpen(open);
          if (!open) setMarkPaidPeriod(null);
        }}
        onConfirm={handleConfirmPayment}
        saving={saving}
      />
    </div>
  );
}
