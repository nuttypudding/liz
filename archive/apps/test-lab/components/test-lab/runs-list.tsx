"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RunDetail } from "./run-detail";
import { toast } from "sonner";
import type { TestRun } from "@/lib/types/test-lab";

export function RunsList() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRuns() {
      try {
        const res = await fetch("/api/test-lab/runs?limit=50");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setRuns(data.runs);
      } catch {
        toast.error("Failed to load test runs");
      } finally {
        setLoading(false);
      }
    }
    fetchRuns();
  }, []);

  if (selectedRunId) {
    return (
      <RunDetail
        runId={selectedRunId}
        onBack={() => setSelectedRunId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No test runs yet. Run a test suite from the Components tab.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const passRate = run.total_cases > 0
          ? ((run.passed_cases / run.total_cases) * 100).toFixed(0)
          : "0";
        return (
          <Card
            key={run.id}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => setSelectedRunId(run.id)}
          >
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {run.component_name}
                </Badge>
                <Badge
                  variant={
                    run.status === "completed"
                      ? "default"
                      : run.status === "running"
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-xs"
                >
                  {run.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600">{run.passed_cases}P</span>
                <span className="text-red-600">{run.failed_cases}F</span>
                <span className="text-muted-foreground">{passRate}%</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(run.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
