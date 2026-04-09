"use client";

import { useState } from "react";
import {
  Building2,
  Droplets,
  Eye,
  EyeOff,
  ExternalLink,
  Flame,
  Globe,
  Pencil,
  Phone,
  Trash2,
  Wifi,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { PropertyUtility, UtilityType, ConfirmationStatus } from "@/lib/types";

interface UtilityInfoCardProps {
  propertyId: string;
  utilities: PropertyUtility[];
  onEdit: () => void;
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

function maskAccountNumber(value: string): string {
  if (value.length <= 4) return value;
  return "****" + value.slice(-4);
}

function StatusBadge({ status }: { status: ConfirmationStatus }) {
  switch (status) {
    case "ai_suggested":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/50 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-400"
        >
          AI Suggested
        </Badge>
      );
    case "confirmed":
      return (
        <Badge className="bg-green-600 hover:bg-green-600">Confirmed</Badge>
      );
    case "not_applicable":
      return <Badge variant="secondary">N/A</Badge>;
  }
}

function UtilityRow({ utility }: { utility: PropertyUtility }) {
  const [showAccount, setShowAccount] = useState(false);
  const config = UTILITY_CONFIG[utility.utility_type];
  const Icon = config.icon;

  return (
    <AccordionItem value={utility.utility_type} className="border-b-0">
      <AccordionTrigger className="py-2 hover:no-underline">
        <div className="flex flex-1 items-center gap-2 min-w-0 pr-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium text-sm">
            {config.label}
          </span>
          {utility.provider_name && (
            <span className="truncate text-sm text-muted-foreground hidden sm:inline">
              &middot; {utility.provider_name}
            </span>
          )}
          <div className="ml-auto shrink-0">
            <StatusBadge status={utility.confirmation_status} />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-6 space-y-1.5 text-sm">
          {utility.provider_name && (
            <p className="font-medium sm:hidden">{utility.provider_name}</p>
          )}
          {utility.provider_phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="size-3.5 shrink-0" />
              <a
                href={`tel:${utility.provider_phone}`}
                className="hover:text-foreground underline underline-offset-2"
              >
                {utility.provider_phone}
              </a>
            </div>
          )}
          {utility.provider_website && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="size-3.5 shrink-0" />
              <a
                href={utility.provider_website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline underline-offset-2 truncate"
              >
                {utility.provider_website.replace(/^https?:\/\//, "")}
                <ExternalLink className="inline size-3 ml-1 -translate-y-px" />
              </a>
            </div>
          )}
          {utility.account_number && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-xs font-medium w-[52px] shrink-0">
                Acct #
              </span>
              <span className="font-mono text-xs">
                {showAccount
                  ? utility.account_number
                  : maskAccountNumber(utility.account_number)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAccount(!showAccount);
                }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showAccount ? "Hide account number" : "Show account number"}
              >
                {showAccount ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
                {showAccount ? "Hide" : "Show"}
              </button>
            </div>
          )}
          {!utility.provider_phone &&
            !utility.provider_website &&
            !utility.account_number && (
              <p className="text-muted-foreground text-xs italic">
                No additional details available.
              </p>
            )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function UtilityInfoCard({
  utilities,
  onEdit,
}: UtilityInfoCardProps) {
  const activeUtilities = utilities.filter(
    (u) => u.confirmation_status !== "not_applicable"
  );
  const confirmedCount = utilities.filter(
    (u) => u.confirmation_status === "confirmed"
  ).length;
  const totalCount = utilities.length;

  const sortedUtilities = [...activeUtilities].sort(
    (a, b) =>
      UTILITY_ORDER.indexOf(a.utility_type) -
      UTILITY_ORDER.indexOf(b.utility_type)
  );

  if (utilities.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <Zap className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Utilities
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-7"
            onClick={onEdit}
            aria-label="Edit utilities"
          >
            <Pencil className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center px-4 pb-6 pt-2 text-center">
          <Zap className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No utility info yet. Click Edit to add or auto-detect.
          </p>
        </CardContent>
      </Card>
    );
  }

  // All utilities are N/A
  if (activeUtilities.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <Zap className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Utilities
          </span>
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
            {confirmedCount}/{totalCount} confirmed
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-7"
            onClick={onEdit}
            aria-label="Edit utilities"
          >
            <Pencil className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center px-4 pb-6 pt-2 text-center">
          <p className="text-sm text-muted-foreground">
            No active utilities.
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
          Utilities
        </span>
        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
          {confirmedCount}/{totalCount} confirmed
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-7"
          onClick={onEdit}
          aria-label="Edit utilities"
        >
          <Pencil className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <Accordion>
            {sortedUtilities
              .filter((_, i) => i % 2 === 0)
              .map((utility) => (
                <UtilityRow key={utility.utility_type} utility={utility} />
              ))}
          </Accordion>
          {sortedUtilities.length > 1 && (
            <Accordion>
              {sortedUtilities
                .filter((_, i) => i % 2 === 1)
                .map((utility) => (
                  <UtilityRow key={utility.utility_type} utility={utility} />
                ))}
            </Accordion>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
