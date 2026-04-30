import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VALID_SAMPLE = /^sample_\d+_[a-z0-9_]+$/;
const VALID_FILE = /^photo_\d+\.(jpg|jpeg|png|gif|webp)$/i;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sampleId: string; filename: string }> },
) {
  const { sampleId, filename } = await params;

  if (!VALID_SAMPLE.test(sampleId) || !VALID_FILE.test(filename)) {
    return new NextResponse("not found", { status: 404 });
  }

  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const filePath = path.join(
    repoRoot,
    "intake",
    "samples",
    sampleId,
    filename,
  );

  // Defense in depth: ensure resolved path stays within the samples dir.
  const samplesRoot = path.join(repoRoot, "intake", "samples") + path.sep;
  if (!filePath.startsWith(samplesRoot)) {
    return new NextResponse("not found", { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = await fs.readFile(filePath);
  } catch {
    return new NextResponse("not found", { status: 404 });
  }

  const ext = filename.toLowerCase().split(".").pop() ?? "jpg";
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "cache-control": "public, max-age=3600",
    },
  });
}
