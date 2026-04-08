import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tenantSchema } from "@/lib/validations";

async function verifyTenantOwnership(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  tenantId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("tenants")
    .select("id, properties!inner(landlord_id)")
    .eq("id", tenantId)
    .eq("properties.landlord_id", userId)
    .single();
  return !!data;
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

    const { id } = await params;
    const body = await request.json();
    const parsed = tenantSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const owned = await verifyTenantOwnership(supabase, id, userId);
    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("tenants")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
    }

    return NextResponse.json({ tenant: data });
  } catch {
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

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const owned = await verifyTenantOwnership(supabase, id, userId);
    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase.from("tenants").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
    }

    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
