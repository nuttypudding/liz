"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EmergencyAlertBannerProps {
  count: number;
}

export function EmergencyAlertBanner({ count }: EmergencyAlertBannerProps) {
  if (count === 0) return null;

  return (
    <Card
      role="alert"
      aria-live="assertive"
      className="border-destructive bg-destructive/10 flex flex-row items-center gap-3 p-4"
    >
      <AlertTriangle className="size-5 shrink-0 text-destructive" />
      <p className="flex-1 text-sm font-medium text-destructive">
        {count} emergency request{count !== 1 ? "s" : ""} need attention
      </p>
      <Link
        href="/requests?urgency=emergency"
        className={buttonVariants({ size: "sm", variant: "destructive", className: "min-h-9 shrink-0" })}
      >
        Review Now
      </Link>
    </Card>
  );
}
