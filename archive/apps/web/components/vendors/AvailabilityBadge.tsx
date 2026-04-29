"use client";

import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VendorAvailabilityRules } from "@/lib/types/scheduling";

interface AvailabilityBadgeProps {
  vendorId: string;
}

export function AvailabilityBadge({ vendorId }: AvailabilityBadgeProps) {
  const [configured, setConfigured] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/vendors/${vendorId}/availability`);
        if (!res.ok) return;
        const { rules } = (await res.json()) as { rules: VendorAvailabilityRules[] };
        if (!cancelled) {
          const uniqueDays = new Set(rules.map((r) => r.day_of_week));
          setConfigured(uniqueDays.size);
        }
      } catch {
        // silently fail — badge is non-critical
      }
    }
    load();
    return () => { cancelled = true; };
  }, [vendorId]);

  if (configured === null || configured === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={<span className="inline-flex size-2.5 rounded-full bg-muted-foreground/30" />}
          />
          <TooltipContent>Not configured</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const pct = Math.round((configured / 7) * 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<span className="inline-flex size-2.5 rounded-full bg-green-500" />}
        />
        <TooltipContent>{pct}% of week available</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
