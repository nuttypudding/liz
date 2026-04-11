"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RentPeriod } from "@/lib/types";

interface RentStatusSummaryBarProps {
  periods: RentPeriod[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  due: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  partial: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export function RentStatusSummaryBar({ periods }: RentStatusSummaryBarProps) {
  const counts = { paid: 0, due: 0, overdue: 0, partial: 0, upcoming: 0 };
  let totalCollected = 0;

  for (const p of periods) {
    if (p.status in counts) {
      counts[p.status as keyof typeof counts]++;
    }
    totalCollected += p.amount_paid ?? 0;
  }

  const items = [
    { label: "Paid", count: counts.paid, status: "paid" },
    { label: "Due", count: counts.due, status: "due" },
    { label: "Overdue", count: counts.overdue, status: "overdue" },
    { label: "Partial", count: counts.partial, status: "partial" },
    { label: "Upcoming", count: counts.upcoming, status: "upcoming" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <Badge
          key={item.status}
          variant="secondary"
          className={cn("text-xs font-medium", STATUS_COLORS[item.status])}
        >
          {item.label}: {item.count}
        </Badge>
      ))}
      <span className="text-sm text-muted-foreground ml-auto">
        Collected: <span className="font-medium text-foreground">{formatCurrency(totalCollected)}</span>
      </span>
    </div>
  );
}
