import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const ReorderPayload = z.object({
  new_priority: z
    .number()
    .int("new_priority must be an integer")
    .min(0, "new_priority must be >= 0")
    .max(999, "new_priority must be <= 999"),
});

export async function PATCH(
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
    const parsed = ReorderPayload.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { new_priority } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Fetch all landlord rules sorted by priority
    const { data: allRules, error: fetchError } = await supabase
      .from("automation_rules")
      .select("id, priority, landlord_id")
      .eq("landlord_id", userId)
      .order("priority", { ascending: true });

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch rules" },
        { status: 500 }
      );
    }

    const rules = allRules ?? [];
    const target = rules.find((r) => r.id === id);

    if (!target) {
      // Rule not found or doesn't belong to this landlord
      const { data: anyRule } = await supabase
        .from("automation_rules")
        .select("id")
        .eq("id", id)
        .single();
      return NextResponse.json(
        { error: anyRule ? "Forbidden" : "Rule not found" },
        { status: anyRule ? 403 : 404 }
      );
    }

    const maxPriority = rules.length - 1;
    if (new_priority > maxPriority) {
      return NextResponse.json(
        {
          error: `new_priority out of range. Must be 0–${maxPriority} (you have ${rules.length} rule${rules.length !== 1 ? "s" : ""})`,
        },
        { status: 400 }
      );
    }

    const old_priority = target.priority;
    if (new_priority === old_priority) {
      // No-op: fetch and return the rule as-is
      const { data: unchanged } = await supabase
        .from("automation_rules")
        .select("*")
        .eq("id", id)
        .single();
      return NextResponse.json({ rule: unchanged });
    }

    // Build list of updates: reorder rules array, then reassign priorities 0..N-1
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);
    const withoutTarget = sorted.filter((r) => r.id !== id);
    withoutTarget.splice(new_priority, 0, target);

    // Only update rules whose priority actually changed
    const updates: Array<{ id: string; priority: number }> = [];
    withoutTarget.forEach((rule, idx) => {
      if (rule.priority !== idx) {
        updates.push({ id: rule.id, priority: idx });
      }
    });

    // Apply updates sequentially
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("automation_rules")
        .update({ priority: update.priority, updated_at: new Date().toISOString() })
        .eq("id", update.id)
        .eq("landlord_id", userId);

      if (updateError) {
        return NextResponse.json(
          { error: "Reorder conflict — please retry" },
          { status: 409 }
        );
      }
    }

    // Fetch and return the updated target rule
    const { data: updated, error: refetchError } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("id", id)
      .single();

    if (refetchError || !updated) {
      return NextResponse.json(
        { error: "Failed to fetch updated rule" },
        { status: 500 }
      );
    }

    return NextResponse.json({ rule: updated });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
