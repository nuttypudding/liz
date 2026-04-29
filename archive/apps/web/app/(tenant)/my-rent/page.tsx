"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Calendar,
  CircleDollarSign,
  Home,
  Info,
  Receipt,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RentStatusBadge } from "@/components/rent/rent-status-badge";
import type { RentPeriod, RentPeriodStatus } from "@/lib/types";

interface TenantRentPeriod extends RentPeriod {
  properties: { name: string; address: string } | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDueDate(period: TenantRentPeriod): string {
  const [year, month] = period.lease_start.split("-");
  const day = String(period.rent_due_day).padStart(2, "0");
  const d = new Date(`${year}-${month}-${day}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPeriodLabel(period: TenantRentPeriod): string {
  const [year, month] = period.lease_start.split("-");
  const d = new Date(`${year}-${month}-01T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getCardBorderClass(status: RentPeriodStatus): string {
  if (status === "overdue") return "border-red-400 dark:border-red-600";
  if (status === "due") return "border-yellow-400 dark:border-yellow-600";
  return "";
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-8 w-32" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function CurrentRentCard({ period }: { period: TenantRentPeriod }) {
  const borderClass = getCardBorderClass(period.status);

  return (
    <Card className={`border-2 ${borderClass}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Current Rent
            </p>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(period.monthly_rent)}
            </p>
          </div>
          <RentStatusBadge status={period.status} />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Home className="size-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Property</p>
              <p className="font-medium truncate">
                {period.properties?.name ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Due Date</p>
              <p className="font-medium">{formatDueDate(period)}</p>
            </div>
          </div>
        </div>

        {period.status === "partial" && period.amount_paid != null && (
          <div className="rounded-md bg-orange-50 dark:bg-orange-950/20 px-3 py-2 text-sm">
            <span className="text-orange-700 dark:text-orange-400">
              Partial payment: {formatCurrency(period.amount_paid)} of{" "}
              {formatCurrency(period.monthly_rent)}
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2">
          <Info className="size-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Payment is recorded by your landlord.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function RentHistoryItem({ period }: { period: TenantRentPeriod }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">
                {formatPeriodLabel(period)}
              </span>
              <RentStatusBadge status={period.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{period.properties?.name ?? "—"}</span>
              {period.paid_at && (
                <span>
                  Paid{" "}
                  {new Date(period.paid_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold">
              {formatCurrency(period.monthly_rent)}
            </p>
            {period.status === "partial" && period.amount_paid != null && (
              <p className="text-xs text-muted-foreground">
                Paid: {formatCurrency(period.amount_paid)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TenantRentPage() {
  const [periods, setPeriods] = useState<TenantRentPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenant/rent");
      if (res.ok) {
        const { data } = await res.json();
        setPeriods(data ?? []);
      } else {
        toast.error("Failed to load rent data");
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

  // The API returns newest-first; treat the first item as the current period
  const currentPeriod = periods.length > 0 ? periods[0] : null;
  const historyPeriods = periods.slice(1);

  return (
    <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="My Rent"
        description="View your rent status and payment history"
      />

      {loading ? (
        <LoadingSkeleton />
      ) : periods.length === 0 ? (
        <EmptyState
          icon={CircleDollarSign}
          title="No Rent Records"
          description="Your landlord hasn't set up rent tracking for your unit yet."
        />
      ) : (
        <div className="space-y-6">
          {currentPeriod && <CurrentRentCard period={currentPeriod} />}

          {historyPeriods.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  History
                </h2>
              </div>
              <div className="space-y-2">
                {historyPeriods.map((period) => (
                  <RentHistoryItem key={period.id} period={period} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
