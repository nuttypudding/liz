import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { landlordProfileSchema } from "@/lib/validations";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("landlord_profiles")
      .select("*")
      .eq("landlord_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error("Unexpected error in GET /api/settings/profile:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = landlordProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Strip optional rent notification fields — columns may not exist yet
    // (migration 20260415000000_rent_notifications.sql must be applied first)
    const { notify_rent_reminders, notify_rent_overdue_summary, ...baseData } = parsed.data;

    const profileData: Record<string, unknown> = {
      ...baseData,
      landlord_id: userId,
      onboarding_completed_at: baseData.onboarding_completed
        ? new Date().toISOString()
        : null,
    };

    // Include rent notification columns only when explicitly provided
    if (notify_rent_reminders !== undefined) profileData.notify_rent_reminders = notify_rent_reminders;
    if (notify_rent_overdue_summary !== undefined) profileData.notify_rent_overdue_summary = notify_rent_overdue_summary;

    const { data, error } = await supabase
      .from("landlord_profiles")
      .upsert(profileData, { onConflict: "landlord_id" })
      .select()
      .single();

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error("Unexpected error in PUT /api/settings/profile:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
