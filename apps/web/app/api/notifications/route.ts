import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const supabase = createServerSupabaseClient();

    // Always get total unread count
    const { count: unreadCount, error: countError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("landlord_id", userId)
      .is("read_at", null);

    if (countError) {
      console.error("Error counting unread notifications:", countError);
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    // Fetch paginated notifications
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("landlord_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      unread_count: unreadCount ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, mark_all_read } = body as { id?: string; mark_all_read?: boolean };

    if (!id && !mark_all_read) {
      return NextResponse.json(
        { error: "Provide either id or mark_all_read" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const readAt = new Date().toISOString();

    if (id) {
      // Verify ownership
      const { data: existing, error: fetchError } = await supabase
        .from("notifications")
        .select("id")
        .eq("id", id)
        .eq("landlord_id", userId)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .eq("id", id);

      if (updateError) {
        console.error("Error marking notification as read:", updateError);
        return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
      }

      return NextResponse.json({ updated: 1 });
    }

    // mark_all_read
    const { data: updated, error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("landlord_id", userId)
      .is("read_at", null)
      .select("id");

    if (updateError) {
      console.error("Error marking all notifications as read:", updateError);
      return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
    }

    return NextResponse.json({ updated: updated?.length ?? 0 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
