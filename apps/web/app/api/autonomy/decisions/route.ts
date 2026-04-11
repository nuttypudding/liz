import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createAutonomousDecisionSchema,
  reviewDecisionSchema,
} from "@/lib/validations";
import { DecisionStatus } from "@/lib/types/autonomy";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const sort = searchParams.get("sort") || "-created_at";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Validate sort parameter
    const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
    const sortDir = sort.startsWith("-") ? "desc" : "asc";
    if (!["created_at", "confidence_score"].includes(sortField)) {
      return NextResponse.json(
        { error: "Invalid sort field" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Build query
    let query = supabase
      .from("autonomous_decisions")
      .select("*", { count: "exact" })
      .eq("landlord_id", userId);

    // Apply status filter if provided
    if (status) {
      if (!["pending_review", "confirmed", "overridden"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 }
        );
      }
      query = query.eq("status", status);
    }

    // Apply sorting and pagination
    query = query.order(sortField, { ascending: sortDir === "asc" });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch decisions" },
        { status: 500 }
      );
    }

    const total = count || 0;
    const hasMore = offset + limit < total;

    return NextResponse.json({
      decisions: data || [],
      total,
      hasMore,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/autonomy/decisions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = createAutonomousDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Create new decision record
    const decisionData = {
      id: crypto.randomUUID(),
      landlord_id: userId,
      ...parsed.data,
      status: "pending_review",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("autonomous_decisions")
      .insert(decisionData)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to create decision" },
        { status: 500 }
      );
    }

    return NextResponse.json({ decision: data }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/autonomy/decisions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
