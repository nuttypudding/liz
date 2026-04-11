"use client";

import {
  BrainCircuit,
  DollarSign,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryStripProps {
  decisionsToday: number;
  totalSpend: number;
  escalations: number;
  pendingReview: number;
}

export function SummaryStrip({
  decisionsToday,
  totalSpend,
  escalations,
  pendingReview,
}: SummaryStripProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 px-4 pb-1 pt-4">
          <BrainCircuit className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Decisions Today
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-3xl font-bold">{decisionsToday}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 px-4 pb-1 pt-4">
          <DollarSign className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Spend (Month)
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-3xl font-bold">
            ${totalSpend.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 px-4 pb-1 pt-4">
          <AlertTriangle className="size-4 shrink-0 text-amber-500" />
          <span className="text-sm font-medium text-muted-foreground">
            Escalations
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {escalations}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 px-4 pb-1 pt-4">
          <Clock className="size-4 shrink-0 text-blue-500" />
          <span className="text-sm font-medium text-muted-foreground">
            Pending Review
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {pendingReview}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function SummaryStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}
