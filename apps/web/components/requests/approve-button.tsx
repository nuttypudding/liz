"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ApproveButtonProps {
  vendorName: string | undefined;
  disabled?: boolean;
  className?: string;
  onConfirm?: () => Promise<void>;
}

export function ApproveButton({
  vendorName,
  disabled,
  className,
  onConfirm,
}: ApproveButtonProps) {
  const [loading, setLoading] = useState(false);
  const isDisabled = disabled || !vendorName || loading;

  async function handleConfirm() {
    if (onConfirm) {
      setLoading(true);
      try {
        await onConfirm();
        toast.success("Work order dispatched", {
          description: vendorName
            ? `Sent to ${vendorName}`
            : "Work order has been sent.",
        });
      } catch {
        toast.error("Failed to dispatch work order");
      } finally {
        setLoading(false);
      }
    } else {
      toast.success("Work order dispatched", {
        description: vendorName
          ? `Sent to ${vendorName}`
          : "Work order has been sent.",
      });
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={isDisabled}
        className={cn(buttonVariants(), className)}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Approve &amp; Send
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send work order?</AlertDialogTitle>
          <AlertDialogDescription>
            {vendorName
              ? `This will send the work order to ${vendorName}. You can follow up directly with the vendor.`
              : "This will dispatch the work order."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Confirm &amp; Send
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
