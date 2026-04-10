"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrentPlanCard } from "@/components/billing/current-plan-card";
import { AvailablePlansCard } from "@/components/billing/available-plans-card";

interface BillingData {
  plan: {
    id: string;
    name: string;
    price_monthly: number;
    limits: { properties: number; requests_per_month: number };
    status: string;
  };
  usage: {
    properties_count: number;
    properties_limit: number;
    requests_this_month: number;
    requests_limit: number;
  };
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingData | null>(null);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) throw new Error("Failed to load billing data");
      const json = (await res.json()) as BillingData;
      setData(json);
    } catch {
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing" />
        <p className="text-sm text-muted-foreground">
          Unable to load billing information. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" />
      <CurrentPlanCard plan={data.plan} usage={data.usage} />
      <AvailablePlansCard />
    </div>
  );
}
