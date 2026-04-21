import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: run, error: runError } = await supabase
      .from("test_runs")
      .select("*")
      .eq("id", id)
      .eq("landlord_id", userId)
      .single();

    if (runError || !run) {
      return NextResponse.json({ error: "Test run not found" }, { status: 404 });
    }

    const { data: cases, error: casesError } = await supabase
      .from("test_cases")
      .select("*")
      .eq("run_id", id)
      .order("created_at", { ascending: true });

    if (casesError) {
      return NextResponse.json({ error: "Failed to fetch test cases" }, { status: 500 });
    }

    return NextResponse.json({ run: { ...run, test_cases: cases ?? [] } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
