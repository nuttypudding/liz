import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string; itemId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, itemId } = await params;
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { completed } = body as Record<string, unknown>;

    if (typeof completed !== "boolean") {
      return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify ownership
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("landlord_id", userId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Verify item exists and belongs to property
    const { data: existingItem, error: itemError } = await supabase
      .from("compliance_checklist_items")
      .select("id, topic")
      .eq("id", itemId)
      .eq("property_id", propertyId)
      .single();

    if (itemError || !existingItem) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    // Update the item
    const now = new Date().toISOString();
    const { data: updatedItem, error: updateError } = await supabase
      .from("compliance_checklist_items")
      .update({
        completed,
        completed_at: completed ? now : null,
        updated_at: now,
      })
      .eq("id", itemId)
      .select("id, topic, description, completed, completed_at, created_at, updated_at")
      .single();

    if (updateError || !updatedItem) {
      console.error("Error updating checklist item:", updateError);
      return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
    }

    // Get landlord profile for audit log
    const { data: profile } = await supabase
      .from("landlord_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (profile) {
      await supabase.from("compliance_audit_log").insert({
        property_id: propertyId,
        landlord_id: profile.id,
        action_type: "checklist_item_updated",
        details: {
          item_id: itemId,
          topic: existingItem.topic,
          completed,
        },
      });
    }

    return NextResponse.json(updatedItem);
  } catch (err) {
    console.error("Unexpected error in PATCH /api/compliance/[propertyId]/checklist/[itemId]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
