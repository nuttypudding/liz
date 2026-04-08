import { vi } from "vitest";
import { NextRequest } from "next/server";

// --- Mock Clerk auth ---

let mockUserId: string | null = "user_landlord_1";
let mockRole: "landlord" | "tenant" | null = "landlord";

export function setMockAuth(userId: string | null) {
  mockUserId = userId;
}

export function setMockRole(role: "landlord" | "tenant" | null) {
  mockRole = role;
}

// The actual mock implementations (used by vi.mock factories)
export function mockAuth() {
  return Promise.resolve({
    userId: mockUserId,
    sessionClaims: mockUserId
      ? { metadata: { role: mockRole } }
      : undefined,
  });
}

export function mockGetRole() {
  return Promise.resolve(mockRole);
}

// --- Mock Supabase client ---

type SupabaseResult = { data: unknown; error: unknown };

let supabaseResults: SupabaseResult[] = [];
let supabaseCallIndex = 0;

/**
 * Configure sequential Supabase query results.
 * Each call to a terminal method (.single(), .maybeSingle(), or the final await)
 * consumes the next result in the queue.
 */
export function setSupabaseResults(results: SupabaseResult[]) {
  supabaseResults = results;
  supabaseCallIndex = 0;
}

function nextResult(): SupabaseResult {
  const result = supabaseResults[supabaseCallIndex] ?? { data: null, error: null };
  supabaseCallIndex++;
  return result;
}

function createChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};

  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "not",
    "order",
    "is",
  ];

  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Terminal methods that return data
  chain.single = vi.fn().mockImplementation(() => nextResult());
  chain.maybeSingle = vi.fn().mockImplementation(() => nextResult());

  // The chain itself is thenable (for queries without .single())
  chain.then = vi.fn().mockImplementation((resolve: (val: SupabaseResult) => void) => {
    return resolve(nextResult());
  });

  return chain;
}

// Mock storage
let storageUploadResult: { error: unknown } = { error: null };
let storageDownloadResult: { data: unknown; error: unknown } = { data: null, error: null };

export function setStorageUploadResult(result: { error: unknown }) {
  storageUploadResult = result;
}

export function setStorageDownloadResult(result: { data: unknown; error: unknown }) {
  storageDownloadResult = result;
}

function createStorageMock() {
  return {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockImplementation(() => storageUploadResult),
      download: vi.fn().mockImplementation(() => storageDownloadResult),
    }),
  };
}

export function createMockSupabaseClient() {
  return {
    from: vi.fn().mockImplementation(() => createChain()),
    storage: createStorageMock(),
  };
}

let mockSupabaseClient = createMockSupabaseClient();

export function resetMockSupabase() {
  mockSupabaseClient = createMockSupabaseClient();
  supabaseResults = [];
  supabaseCallIndex = 0;
  storageUploadResult = { error: null };
  storageDownloadResult = { data: null, error: null };
}

export function mockCreateServerSupabaseClient() {
  return mockSupabaseClient;
}

// --- Mock Anthropic ---

let mockAnthropicResponse = {
  content: [{ type: "text" as const, text: "{}" }],
};

export function setAnthropicResponse(text: string) {
  mockAnthropicResponse = {
    content: [{ type: "text" as const, text }],
  };
}

export const mockAnthropicClient = {
  messages: {
    create: vi.fn().mockImplementation(() => Promise.resolve(mockAnthropicResponse)),
  },
};

// --- Request builders ---

export function buildRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
): NextRequest {
  const { method = "GET", body, headers = {} } = options ?? {};
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

export function buildFormDataRequest(
  url: string,
  formData: FormData
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: formData,
  });
}

// --- Reset all mocks ---

export function resetAllMocks() {
  mockUserId = "user_landlord_1";
  mockRole = "landlord";
  resetMockSupabase();
  mockAnthropicClient.messages.create.mockClear();
}
