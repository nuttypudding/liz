import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "200", 10);
    const model = url.searchParams.get("model");

    let query = supabase
      .from("arena_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (model) {
      query = query.eq("model_id", model);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
