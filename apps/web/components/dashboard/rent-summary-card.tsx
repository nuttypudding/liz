"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecordPaymentDialog } from "@/components/dashboard/record-payment-dialog";
import type { RentStatus } from "@/lib/types";

interface RentSummaryCardProps {
  propertyId: string;
  rentStatus: RentStatus;
  onPaymentRecorded?: () => void;
}

export function RentSummaryCard({ propertyId, rentStatus, onPaymentRecorded }: RentSummaryCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const lastPaidLabel = rentStatus.last_paid_at
    ? new Date(rentStatus.last_paid_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "No payments";

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <DollarSign className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Rent Summary
          </span>
          <span
            className={`ml-auto size-2.5 rounded-full shrink-0 ${
              rentStatus.is_overdue ? "bg-destructive" : "bg-green-500"
            }`}
            aria-label={rentStatus.is_overdue ? "Overdue" : "Current"}
          />
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <p className="text-3xl font-bold">
            ${rentStatus.monthly_rent.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground">
              /mo
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Last paid: {lastPaidLabel}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-1 w-full"
            onClick={() => setDialogOpen(true)}
          >
            Record Payment
          </Button>
        </CardContent>
      </Card>

      <RecordPaymentDialog
        propertyId={propertyId}
        monthlyRent={rentStatus.monthly_rent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={onPaymentRecorded}
      />
    </>
  );
}
