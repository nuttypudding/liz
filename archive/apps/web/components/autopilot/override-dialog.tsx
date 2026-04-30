"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface OverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
  submitting: boolean;
}

export function OverrideDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: OverrideDialogProps) {
  const [reason, setReason] = useState("");

  function handleSubmit() {
    if (!reason.trim()) return;
    onSubmit(reason.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Override Decision</DialogTitle>
          <DialogDescription>
            Explain why you are overriding this AI decision. This helps the AI
            learn your preferences.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="e.g. I want to use a different vendor for this job..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="resize-none"
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
          >
            {submitting ? "Overriding..." : "Override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
