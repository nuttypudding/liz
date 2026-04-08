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

    const profileData = {
      ...parsed.data,
      landlord_id: userId,
      onboarding_completed_at: parsed.data.onboarding_completed
        ? new Date().toISOString()
        : null,
    };

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
