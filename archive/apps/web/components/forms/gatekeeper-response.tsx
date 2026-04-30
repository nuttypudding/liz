"use client";

import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GatekeeperResult {
  self_resolvable: boolean;
  troubleshooting_guide?: string;
  request_id: string;
}

interface GatekeeperResponseProps {
  response: GatekeeperResult;
  onResolved: () => void;
  onEscalate: () => void;
}

export function GatekeeperResponse({
  response,
  onResolved,
  onEscalate,
}: GatekeeperResponseProps) {
  if (response.self_resolvable) {
    return (
      <Card
        className={cn(
          "border-2 border-amber-400",
          "dark:border-amber-500/60"
        )}
      >
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Before we escalate, try this:</p>
            <p className="text-sm text-muted-foreground">
              {response.troubleshooting_guide}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={onResolved}
            >
              This Fixed It
            </Button>
            <Button
              variant="default"
              className="w-full"
              onClick={onEscalate}
            >
              I Still Need Help
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-2 border-green-400",
        "dark:border-green-500/60"
      )}
    >
      <CardContent className="flex items-start gap-3 pt-4">
        <CheckCircle className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400" />
        <p className="text-sm">
          Your request has been submitted and is being reviewed.
        </p>
      </CardContent>
    </Card>
  );
}
