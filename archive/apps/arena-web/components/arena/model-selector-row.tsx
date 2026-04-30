"use client";

import type { ModelConfig } from "@/lib/models";

const TIER_ICONS: Record<number, string> = { 1: "Best", 2: "Good", 3: "Basic" };

interface ModelSelectorRowProps {
  models: ModelConfig[];
  selectedModels: [string, string, string];
  onModelChange: (index: number, modelId: string) => void;
}

export function ModelSelectorRow({
  models,
  selectedModels,
  onModelChange,
}: ModelSelectorRowProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="flex items-end">
        <h3 className="text-sm font-semibold">Samples</h3>
      </div>
      {selectedModels.map((modelId, i) => {
        const cfg = models.find((m) => m.model_id === modelId);
        return (
          <div key={i} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              LLM Model {i + 1}
            </label>
            <select
              value={modelId}
              onChange={(e) => onModelChange(i, e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {models.map((m) => (
                <option key={m.model_id} value={m.model_id}>
                  {TIER_ICONS[m.vision_tier] || ""} — {m.model_id}
                </option>
              ))}
            </select>
            {cfg && (
              <p className="text-xs text-muted-foreground">
                ${cfg.cost_input_1m}/${cfg.cost_output_1m} per 1M tokens
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
