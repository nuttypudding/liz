import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png"]);

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

function findSamplesRoot(): string {
  if (process.env.SAMPLES_ROOT) {
    return path.join(process.env.SAMPLES_ROOT, "intake", "samples");
  }
  const repoRoot = path.resolve(process.cwd(), "../..");
  const samplesPath = path.join(repoRoot, "intake", "samples");
  if (fs.existsSync(samplesPath)) return samplesPath;

  const altPath = path.join(process.cwd(), "intake", "samples");
  if (fs.existsSync(altPath)) return altPath;

  throw new Error("Samples directory not found");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sampleId: string; filename: string }> }
) {
  const { sampleId, filename } = await params;

  // Validate no path traversal
  if (sampleId.includes("..") || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  try {
    const samplesRoot = findSamplesRoot();
    const filePath = path.join(samplesRoot, sampleId, filename);

    // Ensure resolved path stays within samples directory
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(samplesRoot))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = fs.readFileSync(resolved);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
