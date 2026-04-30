"use client";

import { cn } from "@/lib/utils";

interface ComplianceScoreBadgeProps {
  score: number;
  compact?: boolean;
  className?: string;
}

function getScoreConfig(score: number): {
  label: string;
  colorClass: string;
  dotClass: string;
} {
  if (score >= 80) {
    return {
      label: "Compliant",
      colorClass: "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/40 dark:border-green-800",
      dotClass: "bg-green-500",
    };
  }
  if (score >= 50) {
    return {
      label: "Fair",
      colorClass: "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-950/40 dark:border-yellow-800",
      dotClass: "bg-yellow-500",
    };
  }
  if (score >= 25) {
    return {
      label: "Poor",
      colorClass: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-800",
      dotClass: "bg-orange-500",
    };
  }
  return {
    label: "Critical",
    colorClass: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800",
    dotClass: "bg-red-500",
  };
}

export function ComplianceScoreBadge({
  score,
  compact = false,
  className,
}: ComplianceScoreBadgeProps) {
  const { label, colorClass, dotClass } = getScoreConfig(score);

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium",
          colorClass,
          className
        )}
        title={`Compliance: ${score}% — ${label}`}
      >
        <span className={cn("size-1.5 rounded-full shrink-0", dotClass)} />
        {score}%
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        colorClass,
        className
      )}
    >
      <span className={cn("size-2 rounded-full shrink-0", dotClass)} />
      {score}% — {label}
    </span>
  );
}
