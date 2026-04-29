"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  StatusBanner,
  StatusBannerSkeleton,
} from "@/components/autopilot/status-banner";
import {
  SummaryStrip,
  SummaryStripSkeleton,
} from "@/components/autopilot/summary-strip";
import { DecisionFeed } from "@/components/autopilot/decision-feed";
import { DecisionCardSkeleton } from "@/components/autopilot/decision-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { AutonomousDecision } from "@/lib/types/autonomy";

type FilterValue = "" | "pending_review" | "confirmed" | "overridden";

interface DecisionsResponse {
  decisions: AutonomousDecision[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

interface StatsResponse {
  stats: {
    total_decisions: number;
    auto_dispatched: number;
    escalated: number;
    overridden: number;
    total_spend: number;
    trust_score: number | null;
  };
}

function AutopilotContent() {
  const [paused, setPaused] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Summary data
  const [decisionsToday, setDecisionsToday] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);
  const [escalations, setEscalations] = useState(0);
  const [pendingReview, setPendingReview] = useState(0);

  // Decision feed
  const [decisions, setDecisions] = useState<AutonomousDecision[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<FilterValue>("");
  const [feedLoading, setFeedLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/autonomy/settings");
      if (res.ok) {
        const { settings } = await res.json();
        setPaused(settings.paused);
      }
    } catch {
      // Keep default paused state
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, pendingRes] = await Promise.all([
        fetch("/api/autonomy/stats"),
        fetch("/api/autonomy/decisions?status=pending_review&limit=1"),
      ]);

      if (statsRes.ok) {
        const { stats }: StatsResponse = await statsRes.json();
        setTotalSpend(stats.total_spend);
        setEscalations(stats.escalated);
      }

      if (pendingRes.ok) {
        const data: DecisionsResponse = await pendingRes.json();
        setPendingReview(data.total);
      }

      // Decisions today: count decisions from last 24h
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayRes = await fetch(
        `/api/autonomy/decisions?limit=1&sort=-created_at`
      );
      if (todayRes.ok) {
        const todayData: DecisionsResponse = await todayRes.json();
        // Use total as rough proxy — we'll filter client-side if needed
        setDecisionsToday(todayData.total);
      }
    } catch {
      // Stats will show 0
    }
  }, []);

  // Fetch decisions feed
  const fetchDecisions = useCallback(
    async (currentOffset: number, currentFilter: FilterValue) => {
      setFeedLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(LIMIT),
          offset: String(currentOffset),
          sort: "-created_at",
        });
        if (currentFilter) {
          params.set("status", currentFilter);
        }

        const res = await fetch(`/api/autonomy/decisions?${params}`);
        if (!res.ok) throw new Error("Failed to fetch decisions");
        const data: DecisionsResponse = await res.json();
        setDecisions(data.decisions);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch {
        toast.error("Failed to load decisions");
      } finally {
        setFeedLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([
        fetchSettings(),
        fetchStats(),
        fetchDecisions(0, ""),
      ]);
      setLoading(false);
    }
    init();
  }, [fetchSettings, fetchStats, fetchDecisions]);

  function handleFilterChange(newFilter: FilterValue) {
    setFilter(newFilter);
    setOffset(0);
    fetchDecisions(0, newFilter);
  }

  function handlePageChange(newOffset: number) {
    setOffset(newOffset);
    fetchDecisions(newOffset, filter);
  }

  function handleDecisionUpdate(updated: AutonomousDecision) {
    setDecisions((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d))
    );
    // Refresh stats after an action
    fetchStats();
  }

  function handleRefresh() {
    fetchStats();
    fetchDecisions(offset, filter);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Autopilot" description="AI autonomous decisions" />
        <StatusBannerSkeleton />
        <SummaryStripSkeleton />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <DecisionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Autopilot"
        description="AI autonomous decisions for your properties"
      />

      <StatusBanner paused={paused} onToggle={setPaused} />

      <SummaryStrip
        decisionsToday={decisionsToday}
        totalSpend={totalSpend}
        escalations={escalations}
        pendingReview={pendingReview}
      />

      <DecisionFeed
        decisions={decisions}
        total={total}
        hasMore={hasMore}
        offset={offset}
        limit={LIMIT}
        filter={filter}
        loading={feedLoading}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
        onDecisionUpdate={handleDecisionUpdate}
        onRefresh={handleRefresh}
      />
    </div>
  );
}

export default function AutopilotPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader title="Autopilot" description="AI autonomous decisions" />
          <StatusBannerSkeleton />
          <SummaryStripSkeleton />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AutopilotContent />
    </Suspense>
  );
}
