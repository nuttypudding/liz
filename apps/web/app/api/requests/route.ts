import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    const { searchParams } = new URL(request.url);
    const propertyFilter = searchParams.get("property");
    const urgencyFilter = searchParams.get("urgency");
    const statusFilter = searchParams.get("status");

    const supabase = createServerSupabaseClient();

    let query = supabase
      .from("maintenance_requests")
      .select(
        `*, properties(id, name, address, landlord_id), tenants(id, name, email, phone, unit_number), vendors(id, name, phone, email, specialty), request_photos(id, storage_path, file_type)`
      )
      .order("created_at", { ascending: false });

    if (role === "landlord") {
      if (propertyFilter) {
        // Verify landlord owns this property
        const { data: prop } = await supabase
          .from("properties")
          .select("id")
          .eq("id", propertyFilter)
          .eq("landlord_id", userId)
          .single();
        if (!prop) {
          return NextResponse.json({ requests: [] });
        }
        query = query.eq("property_id", propertyFilter);
      } else {
        const { data: properties } = await supabase
          .from("properties")
          .select("id")
          .eq("landlord_id", userId);

        const propertyIds = (properties ?? []).map((p: { id: string }) => p.id);
        if (propertyIds.length === 0) {
          return NextResponse.json({ requests: [] });
        }
        query = query.in("property_id", propertyIds);
      }
    } else if (role === "tenant") {
      // Find the tenant record linked to this Clerk user
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("clerk_user_id", userId)
        .single();

      if (!tenant) {
        return NextResponse.json({ requests: [] });
      }
      query = query.eq("tenant_id", tenant.id);
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (urgencyFilter) {
      query = query.eq("ai_urgency", urgencyFilter);
    }
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch maintenance requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /api/requests:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
