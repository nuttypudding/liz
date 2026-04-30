"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Property } from "@/lib/types";

interface RentToolbarProps {
  month: string; // "YYYY-MM"
  onMonthChange: (month: string) => void;
  properties: Property[];
  propertyFilter: string;
  onPropertyFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  showGenerate: boolean;
  generating: boolean;
  onGenerate: () => void;
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1 + delta, 1);
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${mo}`;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "upcoming", label: "Upcoming" },
  { value: "due", label: "Due" },
  { value: "overdue", label: "Overdue" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
];

export function RentToolbar({
  month,
  onMonthChange,
  properties,
  propertyFilter,
  onPropertyFilterChange,
  statusFilter,
  onStatusFilterChange,
  showGenerate,
  generating,
  onGenerate,
}: RentToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Previous month</span>
        </Button>
        <span className="text-sm font-medium min-w-[140px] text-center">
          {formatMonthLabel(month)}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={propertyFilter} onValueChange={(v) => onPropertyFilterChange(v ?? "all")}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v ?? "all")}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showGenerate && (
          <Button
            size="sm"
            className="h-9"
            onClick={onGenerate}
            disabled={generating}
          >
            <Plus className="size-4" />
            {generating ? "Generating..." : "Generate Rent Periods"}
          </Button>
        )}
      </div>
    </div>
  );
}
