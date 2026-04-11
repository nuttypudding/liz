import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { autonomySettingsUpdateSchema } from "@/lib/validations";
import { AutonomySettings } from "@/lib/types/autonomy";

const DEFAULT_AUTONOMY_SETTINGS = {
  confidence_threshold: 0.85,
  per_decision_cap: 500,
  monthly_cap: 5000,
  excluded_categories: [] as string[],
  preferred_vendors_only: false,
  require_cost_estimate: true,
  emergency_auto_dispatch: true,
  rollback_window_hours: 24,
  paused: true,
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("autonomy_settings")
      .select("*")
      .eq("landlord_id", userId)
      .single();

    // Handle "no rows found" error
    if (error && error.code === "PGRST116") {
      // Create default settings for first-time users
      const defaultSettings = {
        id: crypto.randomUUID(),
        landlord_id: userId,
        ...DEFAULT_AUTONOMY_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdData, error: createError } = await supabase
        .from("autonomy_settings")
        .insert(defaultSettings)
        .select()
        .single();

      if (createError) {
        console.error("Supabase insert error:", createError);
        return NextResponse.json(
          { error: "Failed to initialize autonomy settings" },
          { status: 500 }
        );
      }

      return NextResponse.json({ settings: createdData });
    }

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch autonomy settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data });
  } catch (err) {
    console.error("Unexpected error in GET /api/autonomy/settings:", err);
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
    const parsed = autonomySettingsUpdateSchema.safeParse(body);

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

    // Get current settings to merge with updates
    const { data: currentSettings, error: fetchError } = await supabase
      .from("autonomy_settings")
      .select("*")
      .eq("landlord_id", userId)
      .single();

    let settingsId: string;

    if (fetchError && fetchError.code === "PGRST116") {
      // Settings don't exist yet, create with defaults + updates
      settingsId = crypto.randomUUID();
      const newSettings = {
        id: settingsId,
        landlord_id: userId,
        ...DEFAULT_AUTONOMY_SETTINGS,
        ...parsed.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: createError } = await supabase
        .from("autonomy_settings")
        .insert(newSettings)
        .select()
        .single();

      if (createError) {
        console.error("Supabase insert error:", createError);
        return NextResponse.json(
          { error: "Failed to save autonomy settings" },
          { status: 500 }
        );
      }

      return NextResponse.json({ settings: data });
    }

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch current settings" },
        { status: 500 }
      );
    }

    settingsId = currentSettings.id;

    // Update existing settings
    const updateData = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabase
      .from("autonomy_settings")
      .update(updateData)
      .eq("id", settingsId)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save autonomy settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data });
  } catch (err) {
    console.error("Unexpected error in PUT /api/autonomy/settings:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
