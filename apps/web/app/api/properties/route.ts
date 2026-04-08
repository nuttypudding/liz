import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { propertySchema } from "@/lib/validations";

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can list properties" },
        { status: 403 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("properties")
      .select("*, tenants(*)")
      .eq("landlord_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch properties" },
        { status: 500 }
      );
    }

    return NextResponse.json({ properties: data ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /api/properties:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can create properties" },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const parsed = propertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("properties")
      .insert({
        ...parsed.data,
        landlord_id: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to create property" },
        { status: 500 }
      );
    }

    return NextResponse.json({ property: data }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/properties:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
