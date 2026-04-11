"use client";

import { DollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RentStatusBadge } from "@/components/rent/rent-status-badge";
import type { Property, RentPeriod, Tenant } from "@/lib/types";
import { fullName } from "@/lib/format";

interface RentCardListProps {
  periods: RentPeriod[];
  propertyMap: Map<string, Property>;
  tenantMap: Map<string, Tenant>;
  onMarkPaid: (period: RentPeriod) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDueDate(period: RentPeriod): string {
  const [year, month] = period.lease_start.split("-");
  const day = String(period.rent_due_day).padStart(2, "0");
  const d = new Date(`${year}-${month}-${day}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RentCardList({ periods, propertyMap, tenantMap, onMarkPaid }: RentCardListProps) {
  return (
    <div className="space-y-2">
      {periods.map((period) => {
        const property = propertyMap.get(period.property_id);
        const tenant = tenantMap.get(period.tenant_id);
        const canMarkPaid = period.status !== "paid";

        return (
          <Card key={period.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {property?.name ?? "Unknown"}
                    </span>
                    <RentStatusBadge status={period.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tenant ? fullName(tenant) : "Unknown tenant"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Rent: {formatCurrency(period.monthly_rent)}</span>
                    <span>Due: {formatDueDate(period)}</span>
                    {period.amount_paid != null && period.amount_paid > 0 && (
                      <span>Paid: {formatCurrency(period.amount_paid)}</span>
                    )}
                  </div>
                </div>
                {canMarkPaid && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={() => onMarkPaid(period)}
                  >
                    <DollarSign className="size-3.5" />
                    Pay
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
