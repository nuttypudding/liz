import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { classifyMaintenanceRequest } from "@liz/triage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body as { message?: string };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const result = await classifyMaintenanceRequest(
      { tenant_message: message.trim() },
      anthropic
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
