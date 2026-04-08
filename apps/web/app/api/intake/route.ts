import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { intakeSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = intakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { tenant_message, photo_paths, property_id } = parsed.data;

    const supabase = createServerSupabaseClient();

    // Find the tenant record linked to this Clerk user, if any
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        tenant_message,
        property_id,
        tenant_id: tenant?.id ?? null,
        status: "submitted",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to create maintenance request" },
        { status: 500 }
      );
    }

    // Create request_photos records for any uploaded photos
    if (photo_paths && photo_paths.length > 0) {
      const photoRows = photo_paths.map((path) => {
        const ext = path.split(".").pop() ?? "jpeg";
        return {
          request_id: data.id,
          storage_path: path,
          file_type: `image/${ext}`,
        };
      });
      const { error: photoError } = await supabase
        .from("request_photos")
        .insert(photoRows);
      if (photoError) {
        console.error("Failed to insert request_photos:", photoError);
      }
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/intake:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
