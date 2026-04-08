"use client";

import {
  Building2,
  Droplets,
  ExternalLink,
  Flame,
  Globe,
  Phone,
  Trash2,
  Wifi,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PropertyUtility, UtilityType } from "@/lib/types";

interface TenantUtilityCardProps {
  utilities: PropertyUtility[];
}

const UTILITY_CONFIG: Record<
  UtilityType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  electric: { label: "Electric", icon: Zap },
  gas: { label: "Gas", icon: Flame },
  water_sewer: { label: "Water / Sewer", icon: Droplets },
  trash_recycling: { label: "Trash / Recycling", icon: Trash2 },
  internet_cable: { label: "Internet / Cable", icon: Wifi },
  hoa: { label: "HOA", icon: Building2 },
};

const UTILITY_ORDER: UtilityType[] = [
  "electric",
  "gas",
  "water_sewer",
  "trash_recycling",
  "internet_cable",
  "hoa",
];

function TenantUtilityRow({ utility }: { utility: PropertyUtility }) {
  const config = UTILITY_CONFIG[utility.utility_type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-1 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{config.label}</span>
        {utility.provider_name && (
          <span className="text-sm text-muted-foreground truncate">
            &middot; {utility.provider_name}
          </span>
        )}
      </div>
      {(utility.provider_phone || utility.provider_website) && (
        <div className="flex flex-col gap-1 pl-6 text-sm">
          {utility.provider_phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="size-3.5 shrink-0" />
              <a
                href={`tel:${utility.provider_phone}`}
                className="hover:text-foreground underline underline-offset-2 min-h-[28px] flex items-center"
              >
                {utility.provider_phone}
              </a>
            </div>
          )}
          {utility.provider_website && (
            <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
              <Globe className="size-3.5 shrink-0" />
              <a
                href={utility.provider_website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline underline-offset-2 truncate min-h-[28px] flex items-center"
              >
                {utility.provider_website.replace(/^https?:\/\//, "")}
                <ExternalLink className="inline size-3 ml-1 shrink-0" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TenantUtilityCard({ utilities }: TenantUtilityCardProps) {
  // Only show confirmed + ai_suggested; exclude N/A
  const visibleUtilities = utilities
    .filter((u) => u.confirmation_status !== "not_applicable")
    .sort(
      (a, b) =>
        UTILITY_ORDER.indexOf(a.utility_type) -
        UTILITY_ORDER.indexOf(b.utility_type)
    );

  if (visibleUtilities.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <Zap className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Utility Companies
          </span>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center px-4 pb-6 pt-2 text-center">
          <p className="text-sm text-muted-foreground">
            No utility information available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
        <Zap className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-muted-foreground">
          Utility Companies
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <div className="divide-y">
          {visibleUtilities.map((utility) => (
            <TenantUtilityRow key={utility.utility_type} utility={utility} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
          Contact your landlord if any info is incorrect.
        </p>
      </CardContent>
    </Card>
  );
}
