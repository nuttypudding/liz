import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UrgencyBadgeProps {
  urgency: "low" | "medium" | "emergency";
}

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  if (urgency === "emergency") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="size-3" />
        Emergency
      </Badge>
    );
  }

  if (urgency === "medium") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-amber-500/50 bg-amber-50 text-amber-700",
          "dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-400"
        )}
      >
        Medium
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-green-500/50 bg-green-50 text-green-700",
        "dark:border-green-500/30 dark:bg-green-950/30 dark:text-green-400"
      )}
    >
      Low
    </Badge>
  );
}
