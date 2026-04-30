/**
 * Curated subset of OpenRouter models for the dropdown.
 *
 * Why static, not live-fetched from OpenRouter's `/api/v1/models`:
 * - OpenRouter exposes 300+ models; live-fetched dropdown would be unusable
 *   without grouping/searching, which is more UI work than POC-2 needs.
 * - Costs and vision flags here are accurate as of 2026-04 (sanity-check
 *   against https://openrouter.ai/models when bumping).
 * - For models not in this list, set `AGENT_TRIAGE_MODEL` env on the agent
 *   and pick "Server default" in the dropdown — that path supports any
 *   OpenRouter model id.
 *
 * Costs are USD per 1M tokens.
 */

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  vision: boolean;
  cost_input: number;
  cost_output: number;
  notes?: string;
}

export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4-6";

export const MODELS: ModelOption[] = [
  // Anthropic
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    vision: true,
    cost_input: 3,
    cost_output: 15,
    notes: "default · best balance for triage",
  },
  {
    id: "anthropic/claude-opus-4-7",
    name: "Claude Opus 4.7",
    provider: "Anthropic",
    vision: true,
    cost_input: 15,
    cost_output: 75,
    notes: "highest accuracy · expensive",
  },
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    vision: true,
    cost_input: 1,
    cost_output: 5,
    notes: "cheap · fast",
  },
  // OpenAI
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    vision: true,
    cost_input: 5,
    cost_output: 20,
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 mini",
    provider: "OpenAI",
    vision: true,
    cost_input: 0.5,
    cost_output: 2,
    notes: "cheap · fast",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    vision: true,
    cost_input: 2.5,
    cost_output: 10,
  },
  // Google
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    vision: true,
    cost_input: 1.25,
    cost_output: 5,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    vision: true,
    cost_input: 0.075,
    cost_output: 0.3,
    notes: "cheapest · vision",
  },
  // Meta
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    provider: "Meta",
    vision: false,
    cost_input: 0.13,
    cost_output: 0.4,
    notes: "open weights · text only",
  },
  // DeepSeek
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    vision: false,
    cost_input: 0.14,
    cost_output: 0.28,
    notes: "very cheap · text only",
  },
  // Qwen
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    provider: "Qwen",
    vision: false,
    cost_input: 0.35,
    cost_output: 0.4,
    notes: "open weights",
  },
];

export function modelById(id: string): ModelOption | undefined {
  return MODELS.find((m) => m.id === id);
}
