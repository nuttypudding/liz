import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ZodAutomationRuleCreate } from "@/lib/schemas/rules";

const RULE_LIMIT = 25;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("landlord_id", userId)
      .order("priority", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
    }

    return NextResponse.json({ rules: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ZodAutomationRuleCreate.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Enforce 25-rule limit
    const { count, error: countError } = await supabase
      .from("automation_rules")
      .select("id", { count: "exact", head: true })
      .eq("landlord_id", userId);

    if (countError) {
      return NextResponse.json({ error: "Failed to check rule count" }, { status: 500 });
    }

    if ((count ?? 0) >= RULE_LIMIT) {
      return NextResponse.json(
        { error: `Rule limit of ${RULE_LIMIT} reached. Delete an existing rule to create a new one.` },
        { status: 400 }
      );
    }

    // Auto-set priority to max + 1 if not provided
    let priority = parsed.data.priority;
    if (priority === undefined) {
      const { data: maxRow } = await supabase
        .from("automation_rules")
        .select("priority")
        .eq("landlord_id", userId)
        .order("priority", { ascending: false })
        .limit(1)
        .single();

      priority = maxRow ? maxRow.priority + 1 : 0;
    }

    const { data, error } = await supabase
      .from("automation_rules")
      .insert({
        ...parsed.data,
        priority,
        landlord_id: userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
    }

    return NextResponse.json({ rule: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
