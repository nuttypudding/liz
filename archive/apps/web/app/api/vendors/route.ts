import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { vendorSchema } from "@/lib/validations";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("landlord_id", userId)
      .order("preferred", { ascending: false })
      .order("priority_rank", { ascending: false })
      .order("name");

    if (error) {
      return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
    }

    return NextResponse.json({ vendors: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = vendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("vendors")
      .insert({ ...parsed.data, landlord_id: userId })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
    }

    return NextResponse.json({ vendor: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
