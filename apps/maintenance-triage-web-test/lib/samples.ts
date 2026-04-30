import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export type Urgency = "low" | "medium" | "emergency";
export type Category =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "structural"
  | "pest"
  | "appliance"
  | "general";

export interface SamplePhoto {
  filename: string;
  url: string;
  contentType: string;
}

export interface Sample {
  id: string;
  number: string;
  category: Category;
  message: string;
  photos: SamplePhoto[];
  expected: {
    category: Category;
    urgency: Urgency;
    recommended_action: string;
    confidence_score: number;
  };
  source?: {
    origin?: string;
    subreddit?: string;
    post_url?: string;
    post_title?: string;
  };
}

interface IntakeJson {
  ai_maintenance_intake: {
    input: {
      tenant_message: string;
      photo_upload?: { file_url: string; file_type: string }[];
    };
    ai_output: {
      category: string;
      urgency: string;
      recommended_action: string;
      confidence_score: number;
    };
    source?: Sample["source"];
  };
}

function repoRoot(): string {
  return path.resolve(process.cwd(), "..", "..");
}

function shortNumber(id: string): string {
  const m = id.match(/^sample_(\d+)/);
  return m ? m[1] : "??";
}

function contentTypeFor(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

export async function loadSamples(): Promise<Sample[]> {
  const samplesDir = path.join(repoRoot(), "intake", "samples");
  const entries = await fs.readdir(samplesDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("sample_"))
    .map((e) => e.name);

  const samples = await Promise.all(
    dirs.map(async (id): Promise<Sample | null> => {
      try {
        const intakePath = path.join(samplesDir, id, "intake.json");
        const raw = await fs.readFile(intakePath, "utf-8");
        const parsed = JSON.parse(raw) as IntakeJson;
        const intake = parsed.ai_maintenance_intake;

        // Resolve photos from disk (intake.json's photo_upload[] points at
        // sibling files in the sample dir). We list the directory rather than
        // trust the JSON so missing files surface as missing thumbnails.
        const dirEntries = await fs.readdir(path.join(samplesDir, id));
        const photoFiles = dirEntries
          .filter((f) => /^photo_\d+\.(jpg|jpeg|png|gif|webp)$/i.test(f))
          .sort();
        const photos: SamplePhoto[] = photoFiles.map((filename) => ({
          filename,
          url: `/api/sample-photo/${id}/${filename}`,
          contentType: contentTypeFor(filename),
        }));

        return {
          id,
          number: shortNumber(id),
          category: intake.ai_output.category as Category,
          message: intake.input.tenant_message,
          photos,
          expected: {
            category: intake.ai_output.category as Category,
            urgency: intake.ai_output.urgency as Urgency,
            recommended_action: intake.ai_output.recommended_action,
            confidence_score: intake.ai_output.confidence_score,
          },
          source: intake.source,
        };
      } catch {
        return null;
      }
    }),
  );

  return samples
    .filter((s): s is Sample => s !== null)
    .sort((a, b) => Number(a.number) - Number(b.number));
}
