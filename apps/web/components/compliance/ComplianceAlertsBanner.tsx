"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ComplianceAlertBanner } from "./ComplianceAlertBanner";
import type { ComplianceAlert } from "@/lib/compliance/types";

const SEVERITY_ORDER: Record<string, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export interface ComplianceAlertsBannerProps {
  alerts: ComplianceAlert[];
  propertyId?: string;
  maxVisible?: number;
  compact?: boolean;
  complianceDashboardHref?: string;
  onDismiss?: (alert: ComplianceAlert) => void;
  onActionClick?: (alert: ComplianceAlert) => void;
  className?: string;
}

export function ComplianceAlertsBanner({
  alerts,
  propertyId,
  maxVisible = 3,
  compact = false,
  complianceDashboardHref,
  onDismiss,
  onActionClick,
  className,
}: ComplianceAlertsBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const sorted = useMemo(
    () =>
      [...alerts].sort(
        (a, b) =>
          (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2)
      ),
    [alerts]
  );

  const visible = sorted.filter((a) => !dismissedIds.has(a.id));

  if (visible.length === 0) return null;

  const shown = visible.slice(0, maxVisible);
  const remaining = visible.length - shown.length;

  const dashboardHref =
    complianceDashboardHref ??
    (propertyId ? `/compliance/${propertyId}` : "/compliance");

  function handleDismiss(alert: ComplianceAlert) {
    setDismissedIds((prev) => new Set(prev).add(alert.id));
    onDismiss?.(alert);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {shown.map((alert) => (
        <ComplianceAlertBanner
          key={alert.id}
          alert={alert}
          compact={compact}
          onDismiss={() => handleDismiss(alert)}
          onActionClick={onActionClick}
        />
      ))}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground pl-1">
          <Link
            href={dashboardHref}
            className="font-medium underline underline-offset-2 hover:text-foreground"
          >
            Show {remaining} more alert{remaining !== 1 ? "s" : ""}
          </Link>
        </p>
      )}
    </div>
  );
}
