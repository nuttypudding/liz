import fs from "fs";
import path from "path";

export interface SamplePhoto {
  file_url: string;
  file_type: string;
}

export interface SampleData {
  sample_id: string;
  tenant_message: string;
  photos: SamplePhoto[];
  expected: {
    category: string;
    urgency: string;
    recommended_action: string;
    confidence_score: number;
  };
}

export const CURATED_SAMPLE_IDS = [
  // Plumbing (3)
  "sample_01_plumbing_sewer",
  "sample_11_plumbing_burst_pipe",
  "sample_15_plumbing_running_toilet",
  // Electrical (2)
  "sample_26_electrical_sparking_outlet",
  "sample_24_electrical_flickering_lights",
  // HVAC (4)
  "sample_39_hvac_carbon_monoxide",
  "sample_37_hvac_ac_not_cooling",
  "sample_48_hvac_filter_replacement",
  "sample_04_hvac_dirty_ac",
  // Structural (3)
  "sample_10_structural_ceiling_caved",
  "sample_05_structural_mold_holes",
  "sample_53_structural_wall_cracks",
  // Pest (2)
  "sample_06_pest_cockroaches",
  "sample_68_pest_ants_kitchen",
  // Appliance (3)
  "sample_80_appliance_microwave_sparking",
  "sample_08_appliance_stove",
  "sample_75_appliance_fridge_not_cooling",
  // General (3)
  "sample_02_general_duct_tape",
  "sample_88_general_broken_deadbolt",
  "sample_100_general_parking_pothole",
] as const;

function findSamplePath(sampleId: string): string {
  // Allow explicit override via environment variable
  if (process.env.SAMPLES_ROOT) {
    const envPath = path.join(process.env.SAMPLES_ROOT, "intake", "samples", sampleId, "intake.json");
    if (fs.existsSync(envPath)) return envPath;
  }

  // Try resolving from cwd up to repo root (works from apps/web or apps/test-lab)
  const repoRoot = path.resolve(process.cwd(), "../..");
  const samplePath = path.join(repoRoot, "intake", "samples", sampleId, "intake.json");
  if (fs.existsSync(samplePath)) return samplePath;

  // Fallback: try from cwd directly (running from repo root)
  const altPath = path.join(process.cwd(), "intake", "samples", sampleId, "intake.json");
  if (fs.existsSync(altPath)) return altPath;

  throw new Error(`Sample not found: ${sampleId}`);
}

export function loadSample(sampleId: string): SampleData {
  const filePath = findSamplePath(sampleId);
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const intake = parsed.ai_maintenance_intake;

  const photos: SamplePhoto[] = Array.isArray(intake.input.photo_upload)
    ? intake.input.photo_upload.map((p: { file_url: string; file_type: string }) => ({
        file_url: p.file_url,
        file_type: p.file_type,
      }))
    : [];

  return {
    sample_id: sampleId,
    tenant_message: intake.input.tenant_message,
    photos,
    expected: {
      category: intake.ai_output.category,
      urgency: intake.ai_output.urgency,
      recommended_action: intake.ai_output.recommended_action,
      confidence_score: intake.ai_output.confidence_score,
    },
  };
}

export function loadCuratedSamples(): SampleData[] {
  return CURATED_SAMPLE_IDS.map((id) => loadSample(id));
}
