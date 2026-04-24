"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

export function FeatureAssignment() {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown className="h-4 w-4 -rotate-90 transition-transform" />
        Feature Assignment (coming soon)
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Per-feature model assignment is hidden during the evaluation phase. Once
          you&apos;ve compared models, this section will let you assign the best
          model to each feature (Gatekeeper, Estimator, Matchmaker, Ledger).
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
