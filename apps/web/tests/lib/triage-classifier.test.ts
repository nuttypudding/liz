import { describe, it, expect } from "vitest";
import {
  classifyMaintenanceRequest,
  parseJsonFromText,
  buildProfileContext,
} from "@/lib/triage";
import type { AnthropicClient, ClassifyInput } from "@/lib/triage";

function createMockClient(
  gatekeeperJson: object,
  estimatorJson: object
): AnthropicClient {
  let callCount = 0;
  return {
    messages: {
      create: async () => {
        callCount++;
        const json = callCount === 1 ? gatekeeperJson : estimatorJson;
        return {
          content: [{ type: "text", text: JSON.stringify(json) }],
        };
      },
    },
  };
}

describe("parseJsonFromText", () => {
  it("parses plain JSON", () => {
    const result = parseJsonFromText('{"category": "plumbing"}');
    expect(result).toEqual({ category: "plumbing" });
  });

  it("strips markdown code fences", () => {
    const result = parseJsonFromText('```json\n{"urgency": "emergency"}\n```');
    expect(result).toEqual({ urgency: "emergency" });
  });

  it("strips code fences without json label", () => {
    const result = parseJsonFromText('```\n{"key": "value"}\n```');
    expect(result).toEqual({ key: "value" });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJsonFromText("not json")).toThrow();
  });
});

describe("buildProfileContext", () => {
  it("returns empty string when no prefs", () => {
    expect(buildProfileContext()).toBe("");
  });

  it("returns cost_first description", () => {
    const ctx = buildProfileContext({ risk_appetite: "cost_first" });
    expect(ctx).toContain("prioritizes saving money");
  });

  it("returns speed_first description", () => {
    const ctx = buildProfileContext({ risk_appetite: "speed_first" });
    expect(ctx).toContain("prioritizes speed");
  });

  it("returns balanced description", () => {
    const ctx = buildProfileContext({ risk_appetite: "balanced" });
    expect(ctx).toContain("balance of cost and speed");
  });
});

describe("classifyMaintenanceRequest", () => {
  it("classifies text-only input", async () => {
    const client = createMockClient(
      { self_resolvable: false, troubleshooting_guide: null, confidence: 0.9 },
      {
        category: "plumbing",
        urgency: "emergency",
        recommended_action: "Call a plumber",
        cost_estimate_low: 200,
        cost_estimate_high: 500,
        confidence_score: 0.95,
      }
    );

    const input: ClassifyInput = { tenant_message: "Burst pipe flooding kitchen" };
    const result = await classifyMaintenanceRequest(input, client);

    expect(result.gatekeeper.self_resolvable).toBe(false);
    expect(result.gatekeeper.confidence).toBe(0.9);
    expect(result.classification.category).toBe("plumbing");
    expect(result.classification.urgency).toBe("emergency");
    expect(result.classification.confidence_score).toBe(0.95);
  });

  it("includes photos in estimator content", async () => {
    let capturedMessages: unknown[] = [];
    let callCount = 0;
    const client: AnthropicClient = {
      messages: {
        create: async (params) => {
          callCount++;
          capturedMessages.push(params.messages);
          if (callCount === 1) {
            return {
              content: [{ type: "text", text: '{"self_resolvable": false, "troubleshooting_guide": null, "confidence": 0.8}' }],
            };
          }
          return {
            content: [{ type: "text", text: '{"category": "structural", "urgency": "medium", "recommended_action": "Inspect", "cost_estimate_low": 100, "cost_estimate_high": 300, "confidence_score": 0.7}' }],
          };
        },
      },
    };

    const input: ClassifyInput = {
      tenant_message: "Crack in wall",
      photos: [{ base64: "abc123", media_type: "image/jpeg" }],
    };
    const result = await classifyMaintenanceRequest(input, client);

    expect(result.classification.category).toBe("structural");
    // Estimator call (second) should have content array with image
    const estimatorMsg = capturedMessages[1] as { role: string; content: unknown[] }[];
    const content = estimatorMsg[0].content as { type: string }[];
    expect(content.some((c) => c.type === "image")).toBe(true);
  });

  it("includes landlord prefs in estimator prompt", async () => {
    let capturedContent = "";
    let callCount = 0;
    const client: AnthropicClient = {
      messages: {
        create: async (params) => {
          callCount++;
          if (callCount === 2) {
            const msgs = params.messages[0].content;
            if (Array.isArray(msgs)) {
              const textBlock = msgs.find((b: { type: string }) => b.type === "text") as { text: string } | undefined;
              capturedContent = textBlock?.text ?? "";
            }
          }
          return {
            content: [{ type: "text", text: callCount === 1
              ? '{"self_resolvable": false, "troubleshooting_guide": null, "confidence": 0.5}'
              : '{"category": "general", "urgency": "low", "recommended_action": "inspect", "cost_estimate_low": 50, "cost_estimate_high": 100, "confidence_score": 0.6}'
            }],
          };
        },
      },
    };

    await classifyMaintenanceRequest(
      { tenant_message: "Dripping faucet", landlord_prefs: { risk_appetite: "cost_first" } },
      client
    );

    expect(capturedContent).toContain("prioritizes saving money");
  });

  it("returns defaults when gatekeeper fails", async () => {
    let callCount = 0;
    const client: AnthropicClient = {
      messages: {
        create: async () => {
          callCount++;
          if (callCount === 1) throw new Error("API error");
          return {
            content: [{ type: "text", text: '{"category": "electrical", "urgency": "emergency", "recommended_action": "fix", "cost_estimate_low": 0, "cost_estimate_high": 0, "confidence_score": 0.8}' }],
          };
        },
      },
    };

    const result = await classifyMaintenanceRequest(
      { tenant_message: "Sparking outlet" },
      client
    );

    expect(result.gatekeeper.self_resolvable).toBe(false);
    expect(result.gatekeeper.confidence).toBe(0);
    expect(result.classification.category).toBe("electrical");
  });

  it("returns defaults when estimator fails", async () => {
    let callCount = 0;
    const client: AnthropicClient = {
      messages: {
        create: async () => {
          callCount++;
          if (callCount === 1) {
            return {
              content: [{ type: "text", text: '{"self_resolvable": true, "troubleshooting_guide": "Reset breaker", "confidence": 0.9}' }],
            };
          }
          throw new Error("API error");
        },
      },
    };

    const result = await classifyMaintenanceRequest(
      { tenant_message: "Power out" },
      client
    );

    expect(result.gatekeeper.self_resolvable).toBe(true);
    expect(result.classification.category).toBe("general");
    expect(result.classification.urgency).toBe("medium");
    expect(result.classification.confidence_score).toBe(0.5);
  });
});
