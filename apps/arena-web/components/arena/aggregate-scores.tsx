"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { SampleData } from "@liz/triage";
import type { ArenaResults } from "./arena-content";

interface AggregateScoresProps {
  results: ArenaResults;
  modelIds: [string, string, string];
  samples: SampleData[];
}

export function AggregateScores({ results, modelIds, samples }: AggregateScoresProps) {
  const uniqueModels = [...new Set(modelIds)];
  const hasResults = Object.keys(results).length > 0;

  if (!hasResults) return null;

  const truthMap = Object.fromEntries(
    samples.map((s) => [s.sample_id, s.expected])
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Aggregate Scores</h3>
      <div className="grid grid-cols-3 gap-4">
        {uniqueModels.map((modelId) => {
          let catCorrect = 0;
          let urgCorrect = 0;
          let total = 0;

          for (const [sampleId, modelResults] of Object.entries(results)) {
            const output = modelResults[modelId];
            const truth = truthMap[sampleId];
            if (!output || !truth || output.error) continue;
            total++;
            if (output.category === truth.category) catCorrect++;
            if (output.urgency === truth.urgency) urgCorrect++;
          }

          if (total === 0) return null;

          const catAcc = Math.round((catCorrect / total) * 100);
          const urgAcc = Math.round((urgCorrect / total) * 100);

          return (
            <Card key={modelId}>
              <CardContent className="pt-4 space-y-2">
                <p className="font-mono text-xs font-medium truncate">{modelId}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="text-lg font-semibold">{catAcc}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Urgency</p>
                    <p className="text-lg font-semibold">{urgAcc}%</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">n={total}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
