import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { propertySchema } from "@/lib/validations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can view properties" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("properties")
      .select("*, tenants(*)")
      .eq("id", id)
      .eq("landlord_id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({ property: data });
  } catch (err) {
    console.error("Unexpected error in GET /api/properties/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can update properties" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = propertySchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("properties")
      .update(parsed.data)
      .eq("id", id)
      .eq("landlord_id", userId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Property not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ property: data });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/properties/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can delete properties" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id)
      .eq("landlord_id", userId);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete property" },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/properties/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
