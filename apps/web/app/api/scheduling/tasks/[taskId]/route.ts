import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/scheduling/tasks/[taskId]
// Fetch a single scheduling task by ID. Requires landlord role.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json({ error: "Forbidden: landlord role required" }, { status: 403 });
    }

    const { taskId } = await params;
    const supabase = createServerSupabaseClient();

    const { data: task, error } = await supabase
      .from("scheduling_tasks")
      .select("*, maintenance_requests(property_id)")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: "Scheduling task not found" }, { status: 404 });
    }

    // Verify landlord owns the property
    const req = task.maintenance_requests as { property_id: string } | null;
    if (req) {
      const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("id", req.property_id)
        .eq("landlord_id", userId)
        .single();

      if (!property) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ task });
  } catch (err) {
    console.error("[scheduling/tasks/[taskId] GET] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
