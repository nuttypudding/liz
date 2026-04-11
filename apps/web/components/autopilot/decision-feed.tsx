"use client";

import { Button } from "@/components/ui/button";
import { DecisionCard, DecisionCardSkeleton } from "./decision-card";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { AutonomousDecision } from "@/lib/types/autonomy";

type FilterValue = "" | "pending_review" | "confirmed" | "overridden";

interface DecisionFeedProps {
  decisions: AutonomousDecision[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
  filter: FilterValue;
  loading: boolean;
  onFilterChange: (filter: FilterValue) => void;
  onPageChange: (offset: number) => void;
  onDecisionUpdate: (updated: AutonomousDecision) => void;
  onRefresh: () => void;
}

const filters: { value: FilterValue; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending_review", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "overridden", label: "Overridden" },
];

export function DecisionFeed({
  decisions,
  total,
  hasMore,
  offset,
  limit,
  filter,
  loading,
  onFilterChange,
  onPageChange,
  onDecisionUpdate,
  onRefresh,
}: DecisionFeedProps) {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">Decision Feed</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border bg-muted/50 p-0.5">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => onFilterChange(f.value)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  filter === f.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Decision list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <DecisionCardSkeleton key={i} />
          ))}
        </div>
      ) : decisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {filter
              ? `No ${filter.replace("_", " ")} decisions found`
              : "No autonomous decisions yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Decisions will appear here as the AI handles maintenance requests
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {decisions.map((d) => (
            <DecisionCard
              key={d.id}
              decision={d}
              onUpdate={onDecisionUpdate}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={offset === 0}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous</span>
            </Button>
            <span className="px-2 text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!hasMore}
              onClick={() => onPageChange(offset + limit)}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
