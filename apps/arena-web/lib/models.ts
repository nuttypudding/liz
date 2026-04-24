import fs from "fs";
import path from "path";
import YAML from "yaml";

export interface ModelConfig {
  model_id: string;
  provider: string;
  supports_vision: boolean;
  vision_tier: number;
  vision_note: string;
  cost_input_1m: number;
  cost_output_1m: number;
  max_tokens: number;
}

export interface ModelCatalog {
  models: Record<string, ModelConfig>;
  feature_assignments: Record<string, string>;
}

function findModelsYaml(): string {
  // Try from repo root (monorepo)
  const repoRoot = path.resolve(process.cwd(), "../..");
  const yamlPath = path.join(repoRoot, "apps", "arena", "arena", "config", "models.yaml");
  if (fs.existsSync(yamlPath)) return yamlPath;

  // Fallback: from cwd
  const altPath = path.join(process.cwd(), "..", "arena", "arena", "config", "models.yaml");
  if (fs.existsSync(altPath)) return altPath;

  throw new Error("models.yaml not found");
}

export function loadModelCatalog(): ModelConfig[] {
  const yamlPath = findModelsYaml();
  const raw = fs.readFileSync(yamlPath, "utf-8");
  const parsed = YAML.parse(raw) as ModelCatalog;

  return Object.entries(parsed.models).map(([key, cfg]) => ({
    ...cfg,
    model_id: key,
  }));
}

export function loadFeatureAssignments(): Record<string, string> {
  const yamlPath = findModelsYaml();
  const raw = fs.readFileSync(yamlPath, "utf-8");
  const parsed = YAML.parse(raw) as ModelCatalog;
  return parsed.feature_assignments || {};
}
