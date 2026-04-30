"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface OverdueRentBannerProps {
  overdueCount: number;
}

export function OverdueRentBanner({ overdueCount }: OverdueRentBannerProps) {
  if (overdueCount === 0) return null;

  return (
    <Card
      role="alert"
      aria-live="polite"
      className="border-amber-500 bg-amber-50 dark:bg-amber-950/30 flex flex-row items-center gap-3 p-4"
    >
      <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-500" />
      <p className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-200">
        {overdueCount} {overdueCount === 1 ? "tenant has" : "tenants have"} overdue rent
      </p>
      <Link
        href="/rent?status=overdue"
        className={buttonVariants({
          size: "sm",
          variant: "outline",
          className:
            "min-h-9 shrink-0 border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950",
        })}
      >
        Review Now
      </Link>
    </Card>
  );
}
