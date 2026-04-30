"use client";

import { Badge } from "@/components/ui/badge";

interface CaseComparisonProps {
  label: string;
  expected: string | null;
  actual: string | null;
}

export function CaseComparison({ label, expected, actual }: CaseComparisonProps) {
  const match = expected === actual;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-20 text-muted-foreground">{label}:</span>
      <Badge variant={match ? "default" : "destructive"} className="font-mono text-xs">
        {actual ?? "—"}
      </Badge>
      {!match && (
        <span className="text-xs text-muted-foreground">
          (expected: {expected ?? "—"})
        </span>
      )}
    </div>
  );
}
