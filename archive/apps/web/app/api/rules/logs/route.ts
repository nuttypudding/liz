import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 250;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("request_id");
    const ruleId = searchParams.get("rule_id");
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");
    const matchedOnly = searchParams.get("matched_only") === "true";
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    // Validate limit
    const limit = limitParam !== null ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
    if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
      return NextResponse.json(
        { error: `limit must be between 1 and ${MAX_LIMIT}` },
        { status: 400 }
      );
    }

    // Validate offset
    const offset = offsetParam !== null ? parseInt(offsetParam, 10) : 0;
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json({ error: "offset must be a non-negative integer" }, { status: 400 });
    }

    // Validate date formats
    if (fromDate && isNaN(Date.parse(fromDate))) {
      return NextResponse.json({ error: "from_date must be a valid ISO 8601 timestamp" }, { status: 400 });
    }
    if (toDate && isNaN(Date.parse(toDate))) {
      return NextResponse.json({ error: "to_date must be a valid ISO 8601 timestamp" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Build query with rule name and request category joined
    let query = supabase
      .from("rule_execution_logs")
      .select(
        `
        id,
        request_id,
        rule_id,
        matched,
        conditions_result,
        actions_executed,
        evaluated_at,
        automation_rules!inner ( name ),
        maintenance_requests!inner ( category )
      `,
        { count: "exact" }
      )
      .eq("landlord_id", userId);

    if (requestId) query = query.eq("request_id", requestId);
    if (ruleId) query = query.eq("rule_id", ruleId);
    if (matchedOnly) query = query.eq("matched", true);
    if (fromDate) query = query.gte("evaluated_at", fromDate);
    if (toDate) query = query.lte("evaluated_at", toDate);

    query = query.order("evaluated_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch rule execution logs" }, { status: 500 });
    }

    const total = count ?? 0;
    const logs = (data ?? []).map((row) => ({
      id: row.id,
      request_id: row.request_id,
      rule_id: row.rule_id,
      matched: row.matched,
      conditions_result: row.conditions_result,
      actions_executed: row.actions_executed,
      evaluated_at: row.evaluated_at,
      rule_name: Array.isArray(row.automation_rules)
        ? (row.automation_rules[0] as { name: string } | undefined)?.name ?? null
        : (row.automation_rules as unknown as { name: string } | null)?.name ?? null,
      request_category: Array.isArray(row.maintenance_requests)
        ? (row.maintenance_requests[0] as { category: string } | undefined)?.category ?? null
        : (row.maintenance_requests as unknown as { category: string } | null)?.category ?? null,
    }));

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
