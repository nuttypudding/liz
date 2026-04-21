import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const component = searchParams.get("component");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("test_runs")
      .select("*")
      .eq("landlord_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (component) {
      query = query.eq("component_name", component);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to fetch test runs" }, { status: 500 });
    }

    return NextResponse.json({ runs: data ?? [] });
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
    const { component_name } = body as { component_name?: string };

    if (!component_name || typeof component_name !== "string" || component_name.trim().length === 0) {
      return NextResponse.json({ error: "component_name is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("test_runs")
      .insert({
        landlord_id: userId,
        component_name,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create test run" }, { status: 500 });
    }

    return NextResponse.json({ run: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
