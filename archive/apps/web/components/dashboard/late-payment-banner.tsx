"use client";

import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RentStatus } from "@/lib/types";

interface LatePaymentBannerSingleProps {
  rentStatus: RentStatus;
  rentStatuses?: never;
  onReview?: () => void;
}

interface LatePaymentBannerAggregateProps {
  rentStatus?: never;
  rentStatuses: RentStatus[];
  onReview?: () => void;
}

type LatePaymentBannerProps =
  | LatePaymentBannerSingleProps
  | LatePaymentBannerAggregateProps;

export function LatePaymentBanner(props: LatePaymentBannerProps) {
  const { onReview } = props;

  if (props.rentStatuses) {
    return <AggregateBanner rentStatuses={props.rentStatuses} onReview={onReview} />;
  }

  return <SingleBanner rentStatus={props.rentStatus} onReview={onReview} />;
}

function SingleBanner({
  rentStatus,
  onReview,
}: {
  rentStatus: RentStatus;
  onReview?: () => void;
}) {
  if (!rentStatus.is_overdue) return null;

  const lastPaidLabel = rentStatus.last_paid_at
    ? new Date(rentStatus.last_paid_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Never";

  return (
    <Card
      role="alert"
      aria-live="assertive"
      className="border-destructive bg-destructive/10 flex flex-row items-center gap-3 p-4"
    >
      <AlertTriangle className="size-5 shrink-0 text-destructive" />
      <p className="flex-1 text-sm font-medium text-destructive">
        Rent is {rentStatus.days_overdue} day{rentStatus.days_overdue !== 1 ? "s" : ""} overdue
        (${rentStatus.monthly_rent.toLocaleString()}/mo). Last paid: {lastPaidLabel}.
      </p>
      {onReview && (
        <Button size="sm" variant="destructive" className="min-h-9 shrink-0" onClick={onReview}>
          Review
        </Button>
      )}
    </Card>
  );
}

function AggregateBanner({
  rentStatuses,
  onReview,
}: {
  rentStatuses: RentStatus[];
  onReview?: () => void;
}) {
  const overdueCount = rentStatuses.filter((s) => s.is_overdue).length;

  if (overdueCount === 0) return null;

  return (
    <Card
      role="alert"
      aria-live="assertive"
      className="border-destructive bg-destructive/10 flex flex-row items-center gap-3 p-4"
    >
      <AlertTriangle className="size-5 shrink-0 text-destructive" />
      <p className="flex-1 text-sm font-medium text-destructive">
        {overdueCount} {overdueCount === 1 ? "property has" : "properties have"} overdue rent
      </p>
      {onReview && (
        <Button size="sm" variant="destructive" className="min-h-9 shrink-0" onClick={onReview}>
          Review
        </Button>
      )}
    </Card>
  );
}
