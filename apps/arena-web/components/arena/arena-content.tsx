"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { History, Loader2, Play, Square } from "lucide-react";
import type { SampleData } from "@liz/triage";
import type { ModelConfig } from "@/lib/models";
import { ModelComparisonTable } from "./model-comparison-table";
import { ModelSelectorRow } from "./model-selector-row";
import { SampleRow } from "./sample-row";
import { AggregateScores } from "./aggregate-scores";
import { FeatureAssignment } from "./feature-assignment";
import { RunHistory } from "./run-history";

export interface ArenaResult {
  category: string;
  urgency: string;
  recommended_action: string;
  confidence_score: number;
  cached?: boolean;
  cached_at?: string;
  result_id?: string;
  execution_time_ms?: number;
  error?: string;
}

// { sample_id: { model_id: ArenaResult } }
export type ArenaResults = Record<string, Record<string, ArenaResult>>;

interface ArenaContentProps {
  samples: SampleData[];
  models: ModelConfig[];
}

export function ArenaContent({ samples, models }: ArenaContentProps) {
  const [selectedModels, setSelectedModels] = useState<[string, string, string]>([
    models[0]?.model_id ?? "",
    models[1]?.model_id ?? "",
    models[2]?.model_id ?? "",
  ]);
  const [selectedSamples, setSelectedSamples] = useState<Set<string>>(
    () => new Set(samples.map((s) => s.sample_id))
  );
  const [results, setResults] = useState<ArenaResults>({});
  const [progress, setProgress] = useState<{ current: number; total: number; cached: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const isRunning = progress !== null;

  const toggleSample = useCallback((id: string) => {
    setSelectedSamples((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedSamples((prev) => {
      if (prev.size === samples.length) return new Set();
      return new Set(samples.map((s) => s.sample_id));
    });
  }, [samples]);

  const updateModel = useCallback((index: number, modelId: string) => {
    setSelectedModels((prev) => {
      const next = [...prev] as [string, string, string];
      next[index] = modelId;
      return next;
    });
  }, []);

  const runArena = useCallback(async () => {
    const uniqueModels = [...new Set(selectedModels)];
    const activeSamples = samples.filter((s) => selectedSamples.has(s.sample_id));
    const total = activeSamples.length * uniqueModels.length;

    if (total === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ current: 0, total, cached: 0 });

    let done = 0;
    let cachedCount = 0;
    for (const sample of activeSamples) {
      for (const modelId of uniqueModels) {
        if (controller.signal.aborted) break;

        // Skip if we already have a successful result for this sample+model
        const existing = results[sample.sample_id]?.[modelId];
        if (existing && !existing.error) {
          cachedCount++;
          done++;
          setProgress({ current: done, total, cached: cachedCount });
          continue;
        }

        try {
          const res = await fetch("/api/arena/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model_id: modelId,
              tenant_message: sample.tenant_message,
              sample_id: sample.sample_id,
            }),
            signal: controller.signal,
          });

          const data = await res.json();
          if (data.cached) cachedCount++;

          setResults((prev) => ({
            ...prev,
            [sample.sample_id]: {
              ...prev[sample.sample_id],
              [modelId]: res.ok
                ? data
                : { category: "", urgency: "", recommended_action: "", confidence_score: 0, error: data.error || `HTTP ${res.status}` },
            },
          }));
        } catch (err) {
          if (controller.signal.aborted) break;
          setResults((prev) => ({
            ...prev,
            [sample.sample_id]: {
              ...prev[sample.sample_id],
              [modelId]: {
                category: "",
                urgency: "",
                recommended_action: "",
                confidence_score: 0,
                error: err instanceof Error ? err.message : "Unknown error",
              },
            },
          }));
        }

        done++;
        setProgress({ current: done, total, cached: cachedCount });
      }
      if (controller.signal.aborted) break;
    }

    setProgress(null);
    abortRef.current = null;
  }, [samples, selectedModels, selectedSamples]);

  const stopArena = useCallback(() => {
    abortRef.current?.abort();
    setProgress(null);
  }, []);

  const uniqueModelCount = new Set(selectedModels).size;
  const evalCount = selectedSamples.size * uniqueModelCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="LLM Arena"
        description="Compare vision-capable LLMs on maintenance intake classification"
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory((v) => !v)}
            >
              <History className="mr-1 h-3 w-3" />
              History
            </Button>
            {progress && (
              <span className="text-sm text-muted-foreground">
                {progress.current}/{progress.total}
                {progress.cached > 0 && (
                  <span className="text-blue-600"> ({progress.cached} cached)</span>
                )}
              </span>
            )}
            {isRunning ? (
              <Button variant="destructive" size="sm" onClick={stopArena}>
                <Square className="mr-1 h-3 w-3" />
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={runArena} disabled={evalCount === 0}>
                <Play className="mr-1 h-3 w-3" />
                Run Arena
              </Button>
            )}
          </div>
        }
      />

      {showHistory && <RunHistory onClose={() => setShowHistory(false)} />}

      {progress && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Running... {progress.current}/{progress.total}
            {progress.cached > 0 && (
              <span className="text-blue-600">({progress.cached} from cache)</span>
            )}
          </div>
          <Progress value={(progress.current / progress.total) * 100} />
        </div>
      )}

      <ModelComparisonTable models={models} />

      <ModelSelectorRow
        models={models}
        selectedModels={selectedModels}
        onModelChange={updateModel}
      />

      {/* Sample controls */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selectedSamples.size === samples.length}
            onChange={toggleAll}
            className="rounded"
          />
          Select All
        </label>
        <span className="text-sm text-muted-foreground">
          {selectedSamples.size} sample(s) x {uniqueModelCount} model(s) = {evalCount} evaluations
        </span>
      </div>

      {/* Sample rows */}
      <div className="space-y-0 rounded-md border divide-y">
        {samples.map((sample) => (
          <SampleRow
            key={sample.sample_id}
            sample={sample}
            selected={selectedSamples.has(sample.sample_id)}
            onToggle={() => toggleSample(sample.sample_id)}
            modelIds={selectedModels}
            results={results[sample.sample_id]}
            groundTruth={sample.expected}
          />
        ))}
      </div>

      <AggregateScores
        results={results}
        modelIds={selectedModels}
        samples={samples}
      />

      <FeatureAssignment />
    </div>
  );
}
