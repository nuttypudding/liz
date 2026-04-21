import type { ContentBlockParam } from "@anthropic-ai/sdk/resources";
import type {
  AnthropicClient,
  ClassifyInput,
  ClassifyOutput,
  GatekeeperResult,
  EstimatorResult,
} from "./types";

export function parseJsonFromText(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1] : text;
  return JSON.parse(jsonStr.trim());
}

const RISK_DESCRIPTIONS: Record<string, string> = {
  cost_first:
    "This landlord prioritizes saving money. Rate urgency conservatively for borderline cases. Recommend the most cost-effective solutions.",
  speed_first:
    "This landlord prioritizes speed. Rate urgency higher for borderline cases. Recommend the fastest resolution options.",
  balanced:
    "This landlord values a balance of cost and speed. Weigh both factors equally when rating urgency and recommending actions.",
};

export function buildProfileContext(
  prefs?: ClassifyInput["landlord_prefs"]
): string {
  if (!prefs) return "";
  const desc = RISK_DESCRIPTIONS[prefs.risk_appetite] ?? RISK_DESCRIPTIONS.balanced;
  return `\n\nLandlord preferences: ${desc}`;
}

export async function classifyMaintenanceRequest(
  input: ClassifyInput,
  client: AnthropicClient
): Promise<ClassifyOutput> {
  // --- Gatekeeper --- //
  let gatekeeper: GatekeeperResult = {
    self_resolvable: false,
    troubleshooting_guide: null,
    confidence: 0,
  };
  try {
    const gatekeeperResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a maintenance triage assistant. A tenant has submitted this request:

"${input.tenant_message}"

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
        ? (gatekeeperResponse.content[0].text ?? "{}")
        : "{}";
    gatekeeper = parseJsonFromText(rawText) as GatekeeperResult;
  } catch (err) {
    console.error("Gatekeeper call failed:", err);
  }

  // --- Estimator (with optional vision) --- //
  let estimator: EstimatorResult = {
    category: "general",
    urgency: "medium",
    recommended_action: "Schedule a contractor to inspect the issue.",
    cost_estimate_low: 0,
    cost_estimate_high: 0,
    confidence_score: 0.5,
  };

  try {
    const profileContext = buildProfileContext(input.landlord_prefs);
    const content: ContentBlockParam[] = [
      {
        type: "text",
        text: `Classify this maintenance request. Tenant says: "${input.tenant_message}"${profileContext}

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
    if (input.photos) {
      for (const photo of input.photos.slice(0, 5)) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: photo.media_type,
            data: photo.base64,
          },
        });
      }
    }

    const estimatorResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content }],
    });

    const rawText =
      estimatorResponse.content[0].type === "text"
        ? (estimatorResponse.content[0].text ?? "{}")
        : "{}";
    estimator = parseJsonFromText(rawText) as EstimatorResult;
  } catch (err) {
    console.error("Estimator call failed:", err);
  }

  return { gatekeeper, classification: estimator };
}
