"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2, Play, Square } from "lucide-react";
import type { SampleData } from "@liz/triage";
import type { GatekeeperResult } from "@liz/triage";
import { SummaryBar } from "./summary-bar";
import { SampleGrid } from "./sample-grid";
import { ManualTestForm } from "./manual-test-form";

export type RowResult = {
  status: "idle" | "running" | "done" | "error";
  actual_category?: string;
  actual_urgency?: string;
  confidence?: number;
  passed?: boolean;
  execution_time_ms?: number;
  gatekeeper?: GatekeeperResult;
  recommended_action?: string;
  cost_low?: number;
  cost_high?: number;
  error?: string;
};

interface TestLabContentProps {
  samples: SampleData[];
}

export function TestLabContent({ samples }: TestLabContentProps) {
  const [results, setResults] = useState<Record<string, RowResult>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [runAllProgress, setRunAllProgress] = useState<{
    running: boolean;
    current: number;
    total: number;
  } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runSingle = useCallback(
    async (sampleId: string, signal?: AbortSignal) => {
      const sample = samples.find((s) => s.sample_id === sampleId);
      if (!sample) return;

      setResults((prev) => ({
        ...prev,
        [sampleId]: { status: "running" },
      }));

      const start = performance.now();
      try {
        const res = await fetch("/api/test-lab/components/triage/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: sample.tenant_message }),
          signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const elapsed = performance.now() - start;

        const actualCat = data.classification.category;
        const actualUrg = data.classification.urgency;
        const passed =
          actualCat === sample.expected.category &&
          actualUrg === sample.expected.urgency;

        setResults((prev) => ({
          ...prev,
          [sampleId]: {
            status: "done",
            actual_category: actualCat,
            actual_urgency: actualUrg,
            confidence: data.classification.confidence_score,
            passed,
            execution_time_ms: elapsed,
            gatekeeper: data.gatekeeper,
            recommended_action: data.classification.recommended_action,
            cost_low: data.classification.cost_estimate_low,
            cost_high: data.classification.cost_estimate_high,
          },
        }));
      } catch (err) {
        if (signal?.aborted) return;
        setResults((prev) => ({
          ...prev,
          [sampleId]: {
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          },
        }));
      }
    },
    [samples]
  );

  const runAll = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunAllProgress({ running: true, current: 0, total: samples.length });

    for (let i = 0; i < samples.length; i++) {
      if (controller.signal.aborted) break;
      setRunAllProgress({ running: true, current: i + 1, total: samples.length });
      await runSingle(samples[i].sample_id, controller.signal);
    }

    setRunAllProgress(null);
    abortRef.current = null;
  }, [samples, runSingle]);

  const stopAll = useCallback(() => {
    abortRef.current?.abort();
    setRunAllProgress(null);
  }, []);

  const toggleExpand = useCallback((sampleId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(sampleId)) {
        next.delete(sampleId);
      } else {
        next.add(sampleId);
      }
      return next;
    });
  }, []);

  const isRunningAll = runAllProgress?.running ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Lab"
        description={`AI Maintenance Triage — ${samples.length} samples`}
        action={
          <div className="flex items-center gap-3">
            {runAllProgress && (
              <span className="text-sm text-muted-foreground">
                {runAllProgress.current}/{runAllProgress.total}
              </span>
            )}
            {isRunningAll ? (
              <Button variant="destructive" size="sm" onClick={stopAll}>
                <Square className="mr-1 h-3 w-3" />
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={runAll}>
                <Play className="mr-1 h-3 w-3" />
                Run All
              </Button>
            )}
          </div>
        }
      />

      <SummaryBar results={results} />

      <SampleGrid
        samples={samples}
        results={results}
        expandedRows={expandedRows}
        onRun={(id) => runSingle(id)}
        onToggleExpand={toggleExpand}
      />

      <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown
            className={`h-4 w-4 transition-transform ${manualOpen ? "" : "-rotate-90"}`}
          />
          Manual Test
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <ManualTestForm />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
