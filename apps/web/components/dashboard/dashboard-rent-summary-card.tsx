"use client";

import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardRentSummary } from "@/lib/types";

interface DashboardRentSummaryCardProps {
  data: DashboardRentSummary | null;
  loading?: boolean;
}

export function DashboardRentSummaryCard({ data, loading }: DashboardRentSummaryCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const overdue = data?.overdue_count ?? 0;
  const dueSoon = data?.due_count ?? 0;
  const paid = data?.paid_count ?? 0;
  const collected = data?.total_collected ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <DollarSign className="size-4 text-muted-foreground shrink-0" />
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Rent Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-destructive">{overdue}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Due Soon</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-500">{dueSoon}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-500">{paid}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Collected</p>
            <p className="text-2xl font-bold">${collected.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
