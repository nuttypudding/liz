import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { classifyMaintenanceRequest } from "@/lib/triage";
import { loadCuratedSamples } from "@/lib/triage/samples";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const samples = loadCuratedSamples();

    // Create run record
    const { data: run, error: runError } = await supabase
      .from("test_runs")
      .insert({
        landlord_id: userId,
        component_name: "triage",
        status: "running",
        total_cases: samples.length,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !run) {
      return NextResponse.json({ error: "Failed to create test run" }, { status: 500 });
    }

    const runId = run.id as string;
    let passed = 0;
    let failed = 0;

    // Process samples sequentially (MVP)
    for (const sample of samples) {
      const startTime = Date.now();
      try {
        const result = await classifyMaintenanceRequest(
          { tenant_message: sample.tenant_message },
          anthropic
        );

        const executionTime = Date.now() - startTime;
        const categoryMatch = result.classification.category === sample.expected.category;
        const urgencyMatch = result.classification.urgency === sample.expected.urgency;
        const isPassed = categoryMatch && urgencyMatch;

        if (isPassed) passed++;
        else failed++;

        await supabase.from("test_cases").insert({
          run_id: runId,
          sample_id: sample.sample_id,
          status: isPassed ? "passed" : "failed",
          input_message: sample.tenant_message,
          expected_category: sample.expected.category,
          expected_urgency: sample.expected.urgency,
          actual_category: result.classification.category,
          actual_urgency: result.classification.urgency,
          expected_output: sample.expected,
          actual_output: {
            gatekeeper: result.gatekeeper,
            classification: result.classification,
          },
          category_match: categoryMatch,
          urgency_match: urgencyMatch,
          execution_time_ms: executionTime,
        });
      } catch (err) {
        failed++;
        const executionTime = Date.now() - startTime;
        await supabase.from("test_cases").insert({
          run_id: runId,
          sample_id: sample.sample_id,
          status: "error",
          input_message: sample.tenant_message,
          expected_category: sample.expected.category,
          expected_urgency: sample.expected.urgency,
          expected_output: sample.expected,
          execution_time_ms: executionTime,
          error_message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Update run with final counts
    await supabase
      .from("test_runs")
      .update({
        status: "completed",
        passed_cases: passed,
        failed_cases: failed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    // Fetch complete run with cases
    const { data: completedRun } = await supabase
      .from("test_runs")
      .select("*")
      .eq("id", runId)
      .single();

    const { data: cases } = await supabase
      .from("test_cases")
      .select("*")
      .eq("run_id", runId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      run: { ...completedRun, test_cases: cases ?? [] },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
