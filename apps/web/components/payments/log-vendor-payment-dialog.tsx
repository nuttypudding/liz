"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface LogVendorPaymentDialogProps {
  onSuccess?: () => void;
}

export function LogVendorPaymentDialog({
  onSuccess: _onSuccess,
}: LogVendorPaymentDialogProps) {
  return (
    <Button size="sm">
      <Plus className="size-4 mr-1" />
      Log Payment
    </Button>
  );
}
