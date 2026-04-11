import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reviewDecisionSchema } from "@/lib/validations";

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

    const body: unknown = await request.json();
    const parsed = reviewDecisionSchema.safeParse(body);

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

    // First, verify the decision exists and belongs to the landlord
    const { data: existingDecision, error: fetchError } = await supabase
      .from("autonomous_decisions")
      .select("id")
      .eq("id", id)
      .eq("landlord_id", userId)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      return NextResponse.json(
        { error: "Decision not found" },
        { status: 404 }
      );
    }

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch decision" },
        { status: 500 }
      );
    }

    // Update decision record
    const updateData = {
      status: parsed.data.review_action === "confirmed" ? "confirmed" : "overridden",
      review_action: parsed.data.review_action,
      review_notes: parsed.data.review_notes || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("autonomous_decisions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Failed to update decision" },
        { status: 500 }
      );
    }

    return NextResponse.json({ decision: data });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/autonomy/decisions/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
