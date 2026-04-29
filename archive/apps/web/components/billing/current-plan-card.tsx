"use client";

import { CreditCard } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CurrentPlanCardProps {
  plan: {
    name: string;
    price_monthly: number;
  };
  usage: {
    properties_count: number;
    properties_limit: number;
    requests_this_month: number;
    requests_limit: number;
  };
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const percentage = Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;

  return (
    <Progress
      value={percentage}
      className={cn(
        isNearLimit &&
          "[&_[data-slot=progress-indicator]]:bg-destructive",
      )}
    >
      <ProgressLabel>{label}</ProgressLabel>
      <ProgressValue>{() => `${used} / ${limit}`}</ProgressValue>
    </Progress>
  );
}

export function CurrentPlanCard({ plan, usage }: CurrentPlanCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle>Current Plan</CardTitle>
          <Badge variant="secondary">FREE BETA</Badge>
        </div>
        <CardDescription>
          You&apos;re on the {plan.name} plan.
          {plan.price_monthly === 0
            ? " All features are free during the beta."
            : ` $${plan.price_monthly}/mo.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-4">
          <UsageBar
            label="Properties"
            used={usage.properties_count}
            limit={usage.properties_limit}
          />
          <UsageBar
            label="Requests this month"
            used={usage.requests_this_month}
            limit={usage.requests_limit}
          />
        </div>

        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() =>
            toast.info("Subscription management coming soon.")
          }
        >
          <CreditCard className="size-4 mr-2" />
          Manage Subscription
        </Button>
      </CardContent>
    </Card>
  );
}
