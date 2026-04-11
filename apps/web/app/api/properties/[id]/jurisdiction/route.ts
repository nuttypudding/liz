import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const VALID_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

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

    // Verify ownership
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id, city, state")
      .eq("id", id)
      .eq("landlord_id", userId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Fetch current jurisdiction
    const { data: jurisdiction } = await supabase
      .from("property_jurisdictions")
      .select("property_id, state_code, city, created_at, updated_at")
      .eq("property_id", id)
      .single();

    // Build auto-detect suggestion from property address fields
    let suggestion: { suggested_state_code: string; suggested_city: string | null } | null = null;
    if (!jurisdiction && property.state) {
      const stateCode = property.state.trim().toUpperCase();
      if (VALID_STATE_CODES.has(stateCode)) {
        // Check if city exists in jurisdiction_rules
        let suggestedCity: string | null = null;
        if (property.city) {
          const { data: cityRule } = await supabase
            .from("jurisdiction_rules")
            .select("city")
            .eq("state_code", stateCode)
            .eq("city", property.city)
            .limit(1)
            .single();
          suggestedCity = cityRule?.city ?? null;
        }
        suggestion = { suggested_state_code: stateCode, suggested_city: suggestedCity };
      }
    }

    if (!jurisdiction) {
      return NextResponse.json({
        property_id: id,
        state_code: null,
        city: null,
        suggestion,
      });
    }

    return NextResponse.json({ ...jurisdiction, suggestion });
  } catch (err) {
    console.error("Unexpected error in GET /api/properties/[id]/jurisdiction:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { state_code, city } = body as Record<string, unknown>;

    if (typeof state_code !== "string" || !state_code.trim()) {
      return NextResponse.json({ error: "state_code is required" }, { status: 400 });
    }

    const normalizedState = state_code.trim().toUpperCase();
    if (!VALID_STATE_CODES.has(normalizedState)) {
      return NextResponse.json(
        { error: `Invalid state_code: ${state_code}. Must be a valid 2-letter US state code.` },
        { status: 400 }
      );
    }

    const normalizedCity = typeof city === "string" ? city.trim() || null : null;

    const supabase = createServerSupabaseClient();

    // Verify ownership
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("landlord_id", userId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Validate city exists in jurisdiction_rules if provided
    if (normalizedCity) {
      const { data: cityRule } = await supabase
        .from("jurisdiction_rules")
        .select("city")
        .eq("state_code", normalizedState)
        .eq("city", normalizedCity)
        .limit(1)
        .single();

      if (!cityRule) {
        return NextResponse.json(
          { error: `City "${normalizedCity}" not found in jurisdiction rules for state ${normalizedState}.` },
          { status: 400 }
        );
      }
    }

    // Get landlord profile id for audit log
    const { data: profile } = await supabase
      .from("landlord_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Landlord profile not found" }, { status: 404 });
    }

    // Fetch existing jurisdiction for audit trail
    const { data: existing } = await supabase
      .from("property_jurisdictions")
      .select("state_code, city")
      .eq("property_id", id)
      .single();

    // Upsert jurisdiction (city is required by DB schema; use empty string if null)
    const { data: jurisdiction, error: upsertError } = await supabase
      .from("property_jurisdictions")
      .upsert(
        {
          property_id: id,
          state_code: normalizedState,
          city: normalizedCity ?? "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "property_id" }
      )
      .select("property_id, state_code, city, created_at, updated_at")
      .single();

    if (upsertError || !jurisdiction) {
      console.error("Supabase upsert error:", upsertError);
      return NextResponse.json({ error: "Failed to save jurisdiction" }, { status: 500 });
    }

    // Audit log
    await supabase.from("compliance_audit_log").insert({
      property_id: id,
      landlord_id: profile.id,
      action_type: "jurisdiction_updated",
      details: {
        old_jurisdiction: existing ? { state_code: existing.state_code, city: existing.city } : null,
        new_jurisdiction: { state_code: normalizedState, city: normalizedCity },
      },
    });

    return NextResponse.json(jurisdiction);
  } catch (err) {
    console.error("Unexpected error in POST /api/properties/[id]/jurisdiction:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
