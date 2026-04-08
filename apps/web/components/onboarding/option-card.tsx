"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface OptionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  disabled?: boolean;
}

export function OptionCard({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
  badge,
  badgeVariant = "default",
  disabled = false,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
        "min-h-[72px]",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border hover:border-primary/40 hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {badge && (
            <Badge variant={badgeVariant} className="text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      {selected && (
        <div className="absolute right-3 top-3 size-2 rounded-full bg-primary" />
      )}
    </button>
  );
}
