import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { loadModelCatalog } from "@/lib/models";
import { getSupabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are an AI property maintenance triage system. Analyze the tenant's maintenance request (message and any photos) and classify it.

Respond with ONLY a JSON object — no markdown, no explanation:
{
  "category": "<one of: plumbing, electrical, hvac, structural, pest, appliance, general>",
  "urgency": "<one of: low, medium, emergency>",
  "recommended_action": "<brief recommended next step for the landlord>",
  "confidence_score": <float 0.0-1.0>
}`;

function computeInputHash(modelId: string, sampleId: string, message: string, photoCount: number): string {
  const payload = JSON.stringify({ modelId, sampleId, message, photoCount });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function parseAIOutput(raw: string) {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.includes("\n") ? text.split("\n").slice(1).join("\n") : text.slice(3);
    if (text.endsWith("```")) text = text.slice(0, -3);
    text = text.trim();
  }
  text = text.replace(/,\s*([}\]])/g, "$1");
  text = text.replace(/\/\/[^\n]*/g, "");
  return JSON.parse(text);
}

function findPhotoPath(sampleId: string, filename: string): string | null {
  const repoRoot = path.resolve(process.cwd(), "../..");
  const p = path.join(repoRoot, "intake", "samples", sampleId, filename);
  if (fs.existsSync(p)) return p;
  const alt = path.join(process.cwd(), "intake", "samples", sampleId, filename);
  if (fs.existsSync(alt)) return alt;
  return null;
}

function encodeImage(filePath: string): string {
  return fs.readFileSync(filePath).toString("base64");
}

async function runOpenAI(modelId: string, userText: string, photos: string[]) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const content: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
    { type: "text", text: userText },
  ];
  for (const photo of photos) {
    content.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${photo}`, detail: "low" },
    });
  }

  const resp = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: content as never },
    ],
    max_tokens: 300,
    temperature: 0,
  });
  return parseAIOutput(resp.choices[0].message.content || "{}");
}

async function runAnthropic(modelId: string, userText: string, photos: string[]) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }> = [];
  for (const photo of photos) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: photo },
    });
  }
  content.push({ type: "text", text: userText });

  const resp = await client.messages.create({
    model: modelId,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: content as never }],
    max_tokens: 300,
    temperature: 0,
  });
  const block = resp.content[0];
  return parseAIOutput(block.type === "text" ? block.text : "{}");
}

async function runGoogle(modelId: string, userText: string, photos: string[]) {
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  for (const photo of photos) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: photo } });
  }
  parts.push({ text: userText });

  const resp = await client.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 1000,
      temperature: 0,
      responseMimeType: "application/json",
    },
  });
  return parseAIOutput(resp.text || "{}");
}

async function runGroq(modelId: string, userText: string, photos: string[]) {
  const { default: Groq } = await import("groq-sdk");
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const content: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
    { type: "text", text: userText },
  ];
  for (const photo of photos) {
    content.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${photo}`, detail: "low" },
    });
  }

  const resp = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: content as never },
    ],
    max_tokens: 300,
    temperature: 0,
  });
  return parseAIOutput(resp.choices[0].message.content || "{}");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model_id, tenant_message, sample_id } = body;

    if (!model_id || !tenant_message) {
      return NextResponse.json({ error: "model_id and tenant_message required" }, { status: 400 });
    }

    const catalog = loadModelCatalog();
    const modelCfg = catalog.find((m) => m.model_id === model_id);
    if (!modelCfg) {
      return NextResponse.json({ error: `Unknown model: ${model_id}` }, { status: 400 });
    }

    // Count photos for this sample
    let photoCount = 0;
    const photoFilenames: string[] = [];
    if (sample_id) {
      const repoRoot = path.resolve(process.cwd(), "../..");
      const intakePath = path.join(repoRoot, "intake", "samples", sample_id, "intake.json");
      if (fs.existsSync(intakePath)) {
        const intake = JSON.parse(fs.readFileSync(intakePath, "utf-8"));
        const photoUploads = intake.ai_maintenance_intake?.input?.photo_upload || [];
        for (const p of photoUploads) {
          photoFilenames.push(p.file_url);
        }
        photoCount = photoFilenames.length;
      }
    }

    // Check for cached result
    const inputHash = computeInputHash(model_id, sample_id || "", tenant_message, photoCount);

    try {
      const supabase = getSupabase();
      const { data: rows } = await supabase
        .from("arena_results")
        .select("*")
        .eq("input_hash", inputHash)
        .limit(1);

      const cached = rows?.[0];
      if (cached && !cached.error) {
        return NextResponse.json({
          category: cached.category,
          urgency: cached.urgency,
          recommended_action: cached.recommended_action,
          confidence_score: cached.confidence_score,
          cached: true,
          cached_at: cached.created_at,
          result_id: cached.id,
        });
      }
    } catch {
      // Supabase not available — proceed without cache
    }

    // Encode photos
    const photos: string[] = [];
    for (const filename of photoFilenames) {
      const photoPath = findPhotoPath(sample_id, filename);
      if (photoPath) photos.push(encodeImage(photoPath));
    }

    const userText = `Tenant message: ${tenant_message}`;
    const startTime = Date.now();

    let result;
    switch (modelCfg.provider) {
      case "openai":
        result = await runOpenAI(model_id, userText, photos);
        break;
      case "anthropic":
        result = await runAnthropic(model_id, userText, photos);
        break;
      case "google":
        result = await runGoogle(model_id, userText, photos);
        break;
      case "groq":
        result = await runGroq(model_id, userText, photos);
        break;
      default:
        return NextResponse.json({ error: `Unknown provider: ${modelCfg.provider}` }, { status: 400 });
    }

    const executionTimeMs = Date.now() - startTime;

    // Save result to Supabase
    let resultId: string | undefined;
    try {
      const supabase = getSupabase();
      const { data: inserted } = await supabase
        .from("arena_results")
        .upsert({
          input_hash: inputHash,
          model_id,
          sample_id: sample_id || "manual",
          tenant_message,
          photo_count: photoCount,
          category: result.category,
          urgency: result.urgency,
          recommended_action: result.recommended_action,
          confidence_score: result.confidence_score,
          execution_time_ms: executionTimeMs,
        }, { onConflict: "input_hash" })
        .select("id")
        .single();
      resultId = inserted?.id;
    } catch {
      // Save failed — still return result
    }

    return NextResponse.json({
      ...result,
      cached: false,
      execution_time_ms: executionTimeMs,
      result_id: resultId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
