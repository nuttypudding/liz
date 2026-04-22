"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ArrowLeft } from "lucide-react";
import { CaseComparison } from "./case-comparison";
import { toast } from "sonner";
import type { TestRun, TestCase } from "@/lib/types/test-lab";

interface RunDetailProps {
  runId: string;
  onBack: () => void;
}

export function RunDetail({ runId, onBack }: RunDetailProps) {
  const [run, setRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRun() {
      try {
        const res = await fetch(`/api/test-lab/runs/${runId}`);
        if (!res.ok) throw new Error("Failed to fetch run");
        const data = await res.json();
        setRun(data.run);
      } catch {
        toast.error("Failed to load test run");
      } finally {
        setLoading(false);
      }
    }
    fetchRun();
  }, [runId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!run) return null;

  const cases = run.test_cases ?? [];
  const passRate = run.total_cases > 0 ? (run.passed_cases / run.total_cases) * 100 : 0;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to runs
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Run: {run.component_name}
            </CardTitle>
            <Badge
              variant={run.status === "completed" ? "default" : "secondary"}
            >
              {run.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600 font-medium">{run.passed_cases} passed</span>
            <span className="text-red-600 font-medium">{run.failed_cases} failed</span>
            <span className="text-muted-foreground">{run.total_cases} total</span>
          </div>
          <Progress value={passRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {passRate.toFixed(0)}% pass rate
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {cases.map((tc: TestCase) => (
          <TestCaseRow key={tc.id} testCase={tc} />
        ))}
      </div>
    </div>
  );
}

function TestCaseRow({ testCase: tc }: { testCase: TestCase }) {
  const [open, setOpen] = useState(false);
  const isPassed = tc.status === "passed";
  const isError = tc.status === "error";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={isPassed ? "border-green-200" : isError ? "border-yellow-200" : "border-red-200"}>
        <CollapsibleTrigger
          className="w-full cursor-pointer text-left"
          onClick={() => setOpen(!open)}
        >
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Badge
                  variant={isPassed ? "default" : isError ? "outline" : "destructive"}
                  className="text-xs"
                >
                  {tc.status}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {tc.sample_id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {tc.execution_time_ms != null && (
                  <span className="text-xs text-muted-foreground">
                    {(tc.execution_time_ms / 1000).toFixed(1)}s
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0 text-sm">
            <div>
              <span className="text-muted-foreground">Input:</span>
              <p className="mt-1 rounded bg-muted p-2 text-xs line-clamp-3">
                {tc.input_message}
              </p>
            </div>
            <div className="space-y-1">
              <CaseComparison label="Category" expected={tc.expected_category} actual={tc.actual_category} />
              <CaseComparison label="Urgency" expected={tc.expected_urgency} actual={tc.actual_urgency} />
            </div>
            {tc.error_message && (
              <div className="rounded bg-red-50 p-2 text-xs text-red-600">
                {tc.error_message}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
