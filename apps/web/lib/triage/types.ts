import type { ContentBlockParam } from "@anthropic-ai/sdk/resources";

// --- Dependency injection interface --- //
export interface AnthropicClient {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      messages: { role: string; content: string | ContentBlockParam[] }[];
    }): Promise<{
      content: { type: string; text?: string }[];
    }>;
  };
}

// --- Classifier input/output --- //
export interface Base64Photo {
  base64: string;
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

export interface LandlordPrefs {
  risk_appetite: "cost_first" | "speed_first" | "balanced";
}

export interface ClassifyInput {
  tenant_message: string;
  photos?: Base64Photo[];
  landlord_prefs?: LandlordPrefs;
}

export interface GatekeeperResult {
  self_resolvable: boolean;
  troubleshooting_guide: string | null;
  confidence: number;
}

export interface EstimatorResult {
  category: string;
  urgency: string;
  recommended_action: string;
  cost_estimate_low: number;
  cost_estimate_high: number;
  confidence_score: number;
}

export interface ClassifyOutput {
  gatekeeper: GatekeeperResult;
  classification: EstimatorResult;
}
