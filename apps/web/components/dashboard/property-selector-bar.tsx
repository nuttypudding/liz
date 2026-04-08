"use client";

import { Home, LayoutGrid } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

const ALL_VALUE = "__all__";

interface PropertySelectorBarProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
}

export function PropertySelectorBar({
  properties,
  selectedPropertyId,
  onSelect,
  loading = false,
}: PropertySelectorBarProps) {
  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-20 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop (lg+): Horizontal scroll with house icons */}
      <div className="hidden lg:block">
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-3">
            <PropertyIconButton
              icon={<LayoutGrid className="size-6" />}
              label="All"
              tooltipLabel="All Properties"
              selected={selectedPropertyId === null}
              onClick={() => onSelect(null)}
            />
            {properties.map((property) => (
              <PropertyIconButton
                key={property.id}
                icon={<Home className="size-6" />}
                label={property.name}
                tooltipLabel={property.name}
                tooltipDetail={property.address}
                selected={selectedPropertyId === property.id}
                onClick={() => onSelect(property.id)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Mobile (< lg): Select dropdown */}
      <div className="lg:hidden">
        <Select
          value={selectedPropertyId ?? ALL_VALUE}
          onValueChange={(v) => onSelect(v === ALL_VALUE ? null : v)}
        >
          <SelectTrigger className="w-full h-10">
            <Home className="size-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              <LayoutGrid className="size-4" />
              All Properties
            </SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                <Home className="size-4" />
                <span>
                  {property.name}
                  {property.address && (
                    <span className="ml-1 text-muted-foreground">
                      — {property.address}
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function PropertyIconButton({
  icon,
  label,
  tooltipLabel,
  tooltipDetail,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tooltipLabel: string;
  tooltipDetail?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onClick={onClick}
          className={cn(
            "flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors cursor-pointer",
            selected
              ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {icon}
          <span className="text-xs font-medium truncate w-full text-center">
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span>{tooltipLabel}</span>
          {tooltipDetail && (
            <span className="block text-muted-foreground">{tooltipDetail}</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
