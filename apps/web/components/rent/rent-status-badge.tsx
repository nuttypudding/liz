"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RentPeriodStatus } from "@/lib/types";

const STATUS_CONFIG: Record<RentPeriodStatus, { label: string; className: string }> = {
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  due: {
    label: "Due",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  partial: {
    label: "Partial",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  upcoming: {
    label: "Upcoming",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

interface RentStatusBadgeProps {
  status: RentPeriodStatus;
}

export function RentStatusBadge({ status }: RentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.upcoming;
  return (
    <Badge variant="secondary" className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}
