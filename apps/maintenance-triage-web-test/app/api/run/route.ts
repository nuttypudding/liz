import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const url = process.env.AGENT_TRIAGE_URL;
  const secret = process.env.AGENT_TRIAGE_SHARED_SECRET;

  if (!url || !secret) {
    return NextResponse.json(
      {
        error: {
          code: "misconfigured",
          message:
            "AGENT_TRIAGE_URL and AGENT_TRIAGE_SHARED_SECRET must be set in .env.local",
        },
      },
      { status: 500 },
    );
  }

  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${url}/v1/run`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agent-auth": secret,
      },
      body,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "agent_unreachable",
          message: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
