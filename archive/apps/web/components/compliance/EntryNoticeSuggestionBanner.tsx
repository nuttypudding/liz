"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface EntryNoticeSuggestionBannerProps {
  propertyId: string;
  visitorType?: string;
  visitDate: Date;
  noticeRequiredDays?: number;
  onGenerateNotice?: () => void;
  onDismiss?: () => void;
  className?: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function deadlineDate(visitDate: Date, noticeDays: number): Date {
  const d = new Date(visitDate);
  d.setDate(d.getDate() - noticeDays);
  return d;
}

export function EntryNoticeSuggestionBanner({
  propertyId,
  visitorType = "vendor",
  visitDate,
  noticeRequiredDays,
  onGenerateNotice,
  onDismiss,
  className,
}: EntryNoticeSuggestionBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [handleSeparately, setHandleSeparately] = useState(false);
  const [resolvedDays, setResolvedDays] = useState<number | null>(
    noticeRequiredDays ?? null
  );
  const [jurisdictionConfigured, setJurisdictionConfigured] = useState(true);

  // Fetch notice period from jurisdiction rules if not provided
  useEffect(() => {
    if (noticeRequiredDays != null) return;

    async function fetchNoticePeriod() {
      try {
        // Get property jurisdiction first
        const propRes = await fetch(`/api/properties/${propertyId}`);
        if (!propRes.ok) {
          setJurisdictionConfigured(false);
          return;
        }
        const { property } = await propRes.json();
        const stateCode = property?.jurisdiction?.state_code ?? property?.state;
        if (!stateCode) {
          setJurisdictionConfigured(false);
          return;
        }

        const params = new URLSearchParams({
          state_code: stateCode,
          topic: "notice_period_entry",
          limit: "1",
        });
        if (property?.jurisdiction?.city) {
          params.set("city", property.jurisdiction.city);
        }

        const rulesRes = await fetch(`/api/compliance/knowledge?${params}`);
        if (!rulesRes.ok) {
          setResolvedDays(1); // Fallback: 24-hour notice
          return;
        }
        const data = await rulesRes.json();
        const firstRule = data.jurisdictions?.[0]?.rules?.[0];
        const days =
          firstRule?.details?.required_days ??
          firstRule?.details?.notice_days ??
          1;
        setResolvedDays(Number(days));
      } catch {
        setResolvedDays(1); // Fallback
      }
    }

    fetchNoticePeriod();
  }, [propertyId, noticeRequiredDays]);

  if (dismissed) return null;
  if (resolvedDays === null) return null; // Still loading

  const noticeDays = resolvedDays;
  const now = new Date();
  const deadline = deadlineDate(visitDate, noticeDays);
  const daysUntilVisit = Math.ceil(
    (visitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysUntilVisit <= noticeDays;
  const severity: "error" | "warning" = isUrgent ? "error" : "warning";

  const noticeLabel =
    noticeDays === 1
      ? "24 hours"
      : noticeDays < 1
        ? `${Math.round(noticeDays * 24)} hours`
        : `${noticeDays} days`;

  function handleGenerateNotice() {
    const params = new URLSearchParams({
      noticeType: "entry",
      propertyId,
      purposeHint: visitorType,
      proposedDate: visitDate.toISOString(),
    });
    if (onGenerateNotice) {
      onGenerateNotice();
    } else {
      router.push(`/compliance/notices/create?${params}`);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  if (!jurisdictionConfigured) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border-l-4 border-l-muted-foreground/30 bg-muted/40 px-4 py-3 text-sm",
          className
        )}
      >
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            Configure jurisdiction to enable entry notice reminders
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set up your property&apos;s jurisdiction in Compliance Settings to
            get automatic notice period calculations.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 text-sm",
        severity === "error"
          ? "border-l-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200"
          : "border-l-orange-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
        className
      )}
    >
      <CalendarClock
        className={cn(
          "mt-0.5 size-5 shrink-0",
          severity === "error"
            ? "text-red-600 dark:text-red-400"
            : "text-orange-600 dark:text-amber-400"
        )}
      />
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="font-medium leading-tight">Entry Notice Required</p>
          <p className="text-xs mt-0.5 opacity-90">
            You must provide {noticeLabel} notice before {visitorType} can enter
            the property.{" "}
            {isUrgent
              ? "Notice deadline has passed or is very soon."
              : `Notice required by ${formatDate(deadline)}.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={severity === "error" ? "destructive" : "default"}
            className="h-7 text-xs"
            onClick={handleGenerateNotice}
          >
            Generate Entry Notice
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="entry-notice-handle-separately"
            checked={handleSeparately}
            onCheckedChange={(checked) => {
              setHandleSeparately(Boolean(checked));
              if (checked) handleDismiss();
            }}
            className="size-3.5"
          />
          <Label
            htmlFor="entry-notice-handle-separately"
            className="text-xs cursor-pointer opacity-80"
          >
            I&apos;ll handle this separately
          </Label>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDismiss}
        className="ml-auto shrink-0"
        aria-label="Dismiss entry notice suggestion"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
