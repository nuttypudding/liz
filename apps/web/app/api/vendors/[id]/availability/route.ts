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

    // Verify the vendor belongs to this landlord
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id")
      .eq("id", id)
      .eq("landlord_id", userId)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const { data: rules, error } = await supabase
      .from("vendor_availability_rules")
      .select("*")
      .eq("vendor_id", id)
      .order("day_of_week", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
    }

    return NextResponse.json({ rules: rules ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Verify the vendor belongs to this landlord
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id")
      .eq("id", id)
      .eq("landlord_id", userId)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const body = await request.json();
    const { rules } = body as {
      rules: Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
        timezone: string;
      }>;
    };

    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: "rules must be an array" }, { status: 400 });
    }

    // Validate each rule
    for (const rule of rules) {
      if (rule.day_of_week < 0 || rule.day_of_week > 6) {
        return NextResponse.json({ error: "day_of_week must be 0-6" }, { status: 400 });
      }
      if (!rule.start_time || !rule.end_time) {
        return NextResponse.json({ error: "start_time and end_time are required" }, { status: 400 });
      }
      if (!rule.timezone) {
        return NextResponse.json({ error: "timezone is required" }, { status: 400 });
      }
    }

    // Delete existing rules and insert new ones
    const { error: deleteError } = await supabase
      .from("vendor_availability_rules")
      .delete()
      .eq("vendor_id", id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
    }

    if (rules.length > 0) {
      const rows = rules.map((rule) => ({
        vendor_id: id,
        day_of_week: rule.day_of_week,
        start_time: rule.start_time,
        end_time: rule.end_time,
        timezone: rule.timezone,
      }));

      const { error: insertError } = await supabase
        .from("vendor_availability_rules")
        .insert(rows);

      if (insertError) {
        return NextResponse.json({ error: "Failed to save availability" }, { status: 500 });
      }
    }

    // Fetch the newly saved rules
    const { data: saved } = await supabase
      .from("vendor_availability_rules")
      .select("*")
      .eq("vendor_id", id)
      .order("day_of_week", { ascending: true });

    return NextResponse.json({ rules: saved ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
