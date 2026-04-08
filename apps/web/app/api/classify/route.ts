import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources";

import { anthropic } from "@/lib/anthropic";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const classifyRequestSchema = z.object({
  request_id: z.string().uuid(),
});

type GatekeeperResult = {
  self_resolvable: boolean;
  troubleshooting_guide: string | null;
  confidence: number;
};

type EstimatorResult = {
  category: string;
  urgency: string;
  recommended_action: string;
  cost_estimate_low: number;
  cost_estimate_high: number;
  confidence_score: number;
};

function parseJsonFromText(text: string): unknown {
  // Strip markdown code fences if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1] : text;
  return JSON.parse(jsonStr.trim());
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = classifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { request_id } = parsed.data;

    const supabase = createServerSupabaseClient();

    const { data: maintenanceRequest, error: fetchError } = await supabase
      .from("maintenance_requests")
      .select("id, tenant_message, status, request_photos(id, storage_path, file_type)")
      .eq("id", request_id)
      .single();

    if (fetchError || !maintenanceRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    const { tenant_message } = maintenanceRequest;
    const photos = (maintenanceRequest.request_photos as { id: string; storage_path: string; file_type: string }[]) ?? [];

    // --- Fetch landlord profile for personalization --- //
    let profileContext = "";
    try {
      const { data: profile } = await supabase
        .from("landlord_profiles")
        .select("risk_appetite")
        .eq("landlord_id", userId)
        .single();

      if (profile) {
        const riskDescriptions: Record<string, string> = {
          cost_first:
            "This landlord prioritizes saving money. Rate urgency conservatively for borderline cases. Recommend the most cost-effective solutions.",
          speed_first:
            "This landlord prioritizes speed. Rate urgency higher for borderline cases. Recommend the fastest resolution options.",
          balanced:
            "This landlord values a balance of cost and speed. Weigh both factors equally when rating urgency and recommending actions.",
        };
        profileContext = `\n\nLandlord preferences: ${riskDescriptions[profile.risk_appetite] ?? riskDescriptions.balanced}`;
      }
    } catch {
      // Profile not found — use generic behavior
    }

    // --- Step 1: Gatekeeper --- //
    let gatekeeper: GatekeeperResult = {
      self_resolvable: false,
      troubleshooting_guide: null,
      confidence: 0,
    };
    try {
      const gatekeeperResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a maintenance triage assistant. A tenant has submitted this request:

"${tenant_message}"

Determine if this is something the tenant can likely fix themselves without a professional.

Respond with valid JSON only (no markdown):
{
  "self_resolvable": true or false,
  "troubleshooting_guide": "step-by-step instructions if self-resolvable, or null if not",
  "confidence": 0.0 to 1.0
}`,
          },
        ],
      });

      const rawText =
        gatekeeperResponse.content[0].type === "text"
          ? gatekeeperResponse.content[0].text
          : "{}";
      gatekeeper = parseJsonFromText(rawText) as GatekeeperResult;
    } catch (err) {
      console.error("Gatekeeper call failed:", err);
    }

    // --- Step 2: Estimator (with optional vision) --- //
    let estimator: EstimatorResult = {
      category: "general",
      urgency: "medium",
      recommended_action: "Schedule a contractor to inspect the issue.",
      cost_estimate_low: 0,
      cost_estimate_high: 0,
      confidence_score: 0.5,
    };

    try {
      const content: ContentBlockParam[] = [
        {
          type: "text",
          text: `Classify this maintenance request. Tenant says: "${tenant_message}"${profileContext}

Respond with valid JSON only (no markdown):
{
  "category": "plumbing" or "electrical" or "hvac" or "structural" or "pest" or "appliance" or "general",
  "urgency": "low" or "medium" or "emergency",
  "recommended_action": "brief description of what should be done",
  "cost_estimate_low": number in USD,
  "cost_estimate_high": number in USD,
  "confidence_score": 0.0 to 1.0
}`,
        },
      ];

      // Add photos as vision content
      for (const photo of photos.slice(0, 5)) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("request-photos")
            .download(photo.storage_path);

          if (!downloadError && fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            const base64 = buffer.toString("base64");
            const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
            type ImageMediaType = typeof allowedTypes[number];
            const rawType = photo.file_type || "image/jpeg";
            const mediaType: ImageMediaType = allowedTypes.includes(rawType as ImageMediaType)
              ? (rawType as ImageMediaType)
              : "image/jpeg";
            content.push({
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            });
          }
        } catch (photoErr) {
          console.error("Failed to fetch photo for vision:", photoErr);
        }
      }

      const estimatorResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content }],
      });

      const rawText =
        estimatorResponse.content[0].type === "text"
          ? estimatorResponse.content[0].text
          : "{}";
      estimator = parseJsonFromText(rawText) as EstimatorResult;
    } catch (err) {
      console.error("Estimator call failed:", err);
    }

    // --- Step 3: Store results --- //
    const { error: updateError } = await supabase
      .from("maintenance_requests")
      .update({
        ai_category: estimator.category,
        ai_urgency: estimator.urgency,
        ai_recommended_action: estimator.recommended_action,
        ai_cost_estimate_low: estimator.cost_estimate_low,
        ai_cost_estimate_high: estimator.cost_estimate_high,
        ai_confidence_score: estimator.confidence_score,
        ai_self_resolvable: gatekeeper.self_resolvable,
        ai_troubleshooting_guide: gatekeeper.troubleshooting_guide,
        status: "triaged",
      })
      .eq("id", request_id);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save classification results" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      request_id,
      gatekeeper,
      classification: estimator,
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/classify:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
