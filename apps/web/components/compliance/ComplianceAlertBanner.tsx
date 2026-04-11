"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ComplianceAlert, AlertSeverity } from "@/lib/compliance/types";

const alertVariants = cva(
  "relative flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 text-sm transition-all",
  {
    variants: {
      severity: {
        error:
          "border-l-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200",
        warning:
          "border-l-orange-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
        info: "border-l-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
      },
    },
    defaultVariants: {
      severity: "warning",
    },
  }
);

const ICON_MAP: Record<AlertSeverity, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const ICON_COLOR: Record<AlertSeverity, string> = {
  error: "text-red-600 dark:text-red-400",
  warning: "text-orange-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
};

const ACTION_COLOR: Record<AlertSeverity, string> = {
  error: "text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200",
  warning:
    "text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200",
  info: "text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200",
};

export interface ComplianceAlertBannerProps {
  alert: ComplianceAlert;
  dismissible?: boolean;
  compact?: boolean;
  onDismiss?: () => void;
  onActionClick?: (alert: ComplianceAlert) => void;
  className?: string;
}

export function ComplianceAlertBanner({
  alert,
  dismissible = true,
  compact = false,
  onDismiss,
  onActionClick,
  className,
}: ComplianceAlertBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const severity = alert.severity as AlertSeverity;
  const Icon = ICON_MAP[severity] ?? AlertTriangle;

  function handleDismiss() {
    setIsDismissed(true);
    onDismiss?.();
  }

  if (compact) {
    return (
      <div className={cn(alertVariants({ severity }), "items-center py-2", className)}>
        <Icon className={cn("size-4 shrink-0", ICON_COLOR[severity])} />
        <span className="flex-1 truncate text-xs font-medium">{alert.title}</span>
        {alert.suggested_action && onActionClick && (
          <button
            onClick={() => onActionClick(alert)}
            className={cn("text-xs font-medium underline-offset-2 hover:underline shrink-0", ACTION_COLOR[severity])}
          >
            {alert.suggested_action.length > 40
              ? alert.suggested_action.slice(0, 37) + "..."
              : alert.suggested_action}
          </button>
        )}
        {dismissible && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleDismiss}
            className="ml-1 shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(alertVariants({ severity }), className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", ICON_COLOR[severity])} />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium leading-tight">{alert.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {alert.description}
        </p>
        {alert.suggested_action && (
          <p className="text-xs font-medium">
            {onActionClick ? (
              <button
                onClick={() => onActionClick(alert)}
                className={cn("underline-offset-2 hover:underline", ACTION_COLOR[severity])}
              >
                {alert.suggested_action}
              </button>
            ) : (
              <span className={ACTION_COLOR[severity]}>
                {alert.suggested_action}
              </span>
            )}
          </p>
        )}
        {alert.jurisdiction_reference && (
          <p className="text-[11px] text-muted-foreground">
            Ref: {alert.jurisdiction_reference.statute_citation}
          </p>
        )}
      </div>
      {dismissible && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          className="ml-auto shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
