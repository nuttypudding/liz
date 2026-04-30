"use client";

import { type LucideIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}

export function RoleCard({
  icon: Icon,
  title,
  description,
  onClick,
  loading,
  disabled,
}: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Select role: ${title}`}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl bg-card p-8 text-center",
        "ring-1 ring-foreground/10 text-card-foreground",
        "min-h-[180px] w-full select-none",
        "transition-all duration-150",
        "hover:scale-[1.02] hover:ring-primary/50 hover:shadow-md",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {loading ? (
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      ) : (
        <Icon className="h-10 w-10 text-primary" />
      )}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
