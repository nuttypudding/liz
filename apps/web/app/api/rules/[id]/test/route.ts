import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ZodRuleTestRequest } from "@/lib/schemas/rules";
import { evaluateRuleForTest } from "@/lib/rules/engine";
import { AutomationRule } from "@/lib/types/rules";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = ZodRuleTestRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    if (data.landlord_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = evaluateRuleForTest(data as AutomationRule, parsed.data);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
