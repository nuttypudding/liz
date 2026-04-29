"use client";

import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";
import type { SampleData } from "@liz/triage";
import type { ArenaResult } from "./arena-content";
import { ResultCard } from "./result-card";

interface SampleRowProps {
  sample: SampleData;
  selected: boolean;
  onToggle: () => void;
  modelIds: [string, string, string];
  results?: Record<string, ArenaResult>;
  groundTruth: SampleData["expected"];
}

function shortLabel(sampleId: string) {
  const parts = sampleId.split("_", 3);
  const num = parts[1] || "?";
  const desc = parts[2]?.replace(/_/g, " ") || sampleId;
  return { num, desc };
}

export function SampleRow({
  sample,
  selected,
  onToggle,
  modelIds,
  results,
  groundTruth,
}: SampleRowProps) {
  const { num, desc } = shortLabel(sample.sample_id);

  return (
    <div className={`grid grid-cols-4 gap-4 p-4 ${selected ? "bg-background" : "bg-muted/20"}`}>
      {/* Column 1: Sample info */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="rounded"
          />
          <span className="font-mono text-muted-foreground">{num}</span>
          <span className="capitalize">{desc}</span>
        </label>

        {selected && (
          <>
            {/* Photos */}
            {sample.photos.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {sample.photos.map((photo) => (
                  <a
                    key={photo.file_url}
                    href={`/samples/${sample.sample_id}/${photo.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded border border-border overflow-hidden hover:ring-2 hover:ring-ring transition-shadow"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/samples/${sample.sample_id}/${photo.file_url}`}
                      alt={photo.file_url}
                      className="h-12 w-12 object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            )}

            {/* Tenant message */}
            <p className="text-xs text-muted-foreground line-clamp-3">
              {sample.tenant_message}
            </p>

            {/* Ground truth */}
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {groundTruth.category}
              </Badge>
              <Badge
                className={`text-xs ${
                  groundTruth.urgency === "emergency"
                    ? "bg-red-100 text-red-800 border-red-200"
                    : groundTruth.urgency === "medium"
                      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                      : "bg-green-100 text-green-800 border-green-200"
                }`}
              >
                {groundTruth.urgency}
              </Badge>
              {sample.photos.length > 0 && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Camera className="h-3 w-3" />
                  <span className="text-xs">{sample.photos.length}</span>
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Columns 2-4: Model results */}
      {modelIds.map((modelId, i) => (
        <div key={`${modelId}-${i}`}>
          {selected ? (
            <ResultCard
              result={results?.[modelId]}
              truth={groundTruth}
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ))}
    </div>
  );
}
