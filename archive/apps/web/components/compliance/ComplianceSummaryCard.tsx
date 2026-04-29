"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, AlertCircle, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ComplianceStats {
  average_score: number;
  properties_needing_attention: number;
  critical_alerts_count: number;
  total_properties: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 25) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function ComplianceSummaryCard() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/compliance/stats");
        if (res.ok) {
          setStats(await res.json());
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">Legal Compliance</span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">Unable to load compliance data.</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total_properties === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4 px-4">
          <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">Legal Compliance</span>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-sm font-medium">No properties to assess</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add properties and configure jurisdictions to enable compliance checking.
            </p>
          </div>
          <Button size="sm" className="w-full" asChild>
            <Link href="/compliance">View Compliance Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scoreColor = getScoreColor(stats.average_score);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4 px-4">
        <ShieldCheck
          className={cn(
            "size-4 shrink-0",
            stats.average_score >= 80 ? "text-green-500" : "text-orange-500"
          )}
        />
        <span className="text-sm font-medium text-muted-foreground">Legal Compliance</span>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Average compliance score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Avg. Score</span>
          </div>
          <span
            className={cn("text-2xl font-bold", scoreColor)}
            aria-label={`Average compliance score: ${stats.average_score}%`}
          >
            {stats.average_score}%
          </span>
        </div>

        {/* Properties needing attention */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Need Attention</span>
          </div>
          <span
            className={cn(
              "text-2xl font-bold",
              stats.properties_needing_attention > 0
                ? "text-orange-600 dark:text-orange-400"
                : "text-green-600 dark:text-green-400"
            )}
            aria-label={`${stats.properties_needing_attention} properties needing attention`}
          >
            {stats.properties_needing_attention}
          </span>
        </div>

        {/* Critical alerts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Critical Alerts</span>
          </div>
          <span
            className={cn(
              "text-2xl font-bold",
              stats.critical_alerts_count > 0
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            )}
            aria-label={`${stats.critical_alerts_count} open critical alerts`}
          >
            {stats.critical_alerts_count}
          </span>
        </div>

        {/* Link to compliance dashboard */}
        <Link
          href="/compliance"
          className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-1"
        >
          View Compliance Dashboard
          <ArrowRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
