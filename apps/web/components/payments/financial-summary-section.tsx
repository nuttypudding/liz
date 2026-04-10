"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface FinancialSummarySectionProps {
  month: number;
  year?: number;
}

export function FinancialSummarySection({
  month: _month,
  year: _year,
}: FinancialSummarySectionProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12">
        <TrendingUp className="size-8 text-muted-foreground" />
        <p className="text-lg font-semibold">Financial Summary</p>
        <p className="text-sm text-muted-foreground">
          P&L cards, trend chart, and property breakdown coming in task 149.
        </p>
      </CardContent>
    </Card>
  );
}
