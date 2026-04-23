"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { RowResult } from "./test-lab-content";

interface SummaryBarProps {
  results: Record<string, RowResult>;
}

export function SummaryBar({ results }: SummaryBarProps) {
  const entries = Object.values(results).filter((r) => r.status === "done");
  if (entries.length === 0) return null;

  const passed = entries.filter((r) => r.passed).length;
  const failed = entries.length - passed;
  const rate = Math.round((passed / entries.length) * 100);

  return (
    <Card>
      <CardContent className="flex items-center gap-6 py-3">
        <span className="text-sm font-medium text-green-700">
          {passed} passed
        </span>
        <span className="text-sm font-medium text-red-700">
          {failed} failed
        </span>
        <span className="text-sm text-muted-foreground">
          Pass rate: {rate}%
        </span>
        <Progress value={rate} className="flex-1" />
      </CardContent>
    </Card>
  );
}
