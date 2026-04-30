"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, CheckCircle2, Activity, Plus, ArrowRight, Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RulesSummary } from "@/lib/types/rules";

const MAX_RULES = 25;

export function RulesSummaryCard() {
  const [summary, setSummary] = useState<RulesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/rules/summary");
        if (res.ok) {
          setSummary(await res.json());
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
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
          <Zap className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Automation Rules
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">
            Unable to load rules summary.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasRules =
    summary !== null &&
    (summary.active_rules > 0 ||
      summary.auto_approved_this_month > 0 ||
      summary.total_processed_this_month > 0);

  if (!hasRules) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4 px-4">
          <Zap className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Automation Rules
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-sm font-medium">No automation rules created yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create rules to automatically approve and manage maintenance requests
            </p>
          </div>
          <Button size="sm" className="w-full" asChild>
            <Link href="/settings?tab=rules">
              <Plus className="size-4 mr-1.5" />
              Create your first rule
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4 px-4">
        <Zap className="size-4 text-blue-500 shrink-0" />
        <span className="text-sm font-medium text-muted-foreground">
          Automation Rules
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Active Rules */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="size-3.5 text-blue-500 shrink-0" />
            <span className="text-sm text-muted-foreground">Active Rules</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-2xl font-bold text-blue-600 dark:text-blue-400"
              aria-label={`${summary!.active_rules} active rules`}
            >
              {summary!.active_rules}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="text-xs text-muted-foreground cursor-help flex items-center gap-0.5">
                  /{MAX_RULES}
                  <Info className="size-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Maximum {MAX_RULES} rules per account</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Auto-Approved This Month */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
            <span className="text-sm text-muted-foreground">Auto-Approved</span>
          </div>
          <span
            className="text-2xl font-bold text-green-600 dark:text-green-400"
            aria-label={`${summary!.auto_approved_this_month} auto-approved this month`}
          >
            {summary!.auto_approved_this_month}
          </span>
        </div>

        {/* Total Processed This Month */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Processed</span>
          </div>
          <span
            className="text-2xl font-bold"
            aria-label={`${summary!.total_processed_this_month} requests processed this month`}
          >
            {summary!.total_processed_this_month}
          </span>
        </div>

        {/* Manage Rules Link */}
        <Link
          href="/settings?tab=rules"
          className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-1"
        >
          Manage rules
          <ArrowRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
