"use client";

import { DollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RentStatusBadge } from "@/components/rent/rent-status-badge";
import type { Property, RentPeriod, Tenant } from "@/lib/types";
import { fullName } from "@/lib/format";

interface RentTableProps {
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

export function RentTable({ periods, propertyMap, tenantMap, onMarkPaid }: RentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Property</TableHead>
          <TableHead>Tenant</TableHead>
          <TableHead className="text-right">Rent</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {periods.map((period) => {
          const property = propertyMap.get(period.property_id);
          const tenant = tenantMap.get(period.tenant_id);
          const canMarkPaid = period.status !== "paid";

          return (
            <TableRow key={period.id}>
              <TableCell className="text-sm font-medium">
                {property?.name ?? "Unknown"}
              </TableCell>
              <TableCell className="text-sm">
                {tenant ? fullName(tenant) : "Unknown"}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {formatCurrency(period.monthly_rent)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDueDate(period)}
              </TableCell>
              <TableCell>
                <RentStatusBadge status={period.status} />
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {period.amount_paid != null && period.amount_paid > 0
                  ? formatCurrency(period.amount_paid)
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                {canMarkPaid && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => onMarkPaid(period)}
                  >
                    <DollarSign className="size-3.5" />
                    Mark Paid
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
