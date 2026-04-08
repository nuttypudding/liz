import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Document, DocumentType } from "@/lib/types";

const VALID_DOCUMENT_TYPES = new Set<string>([
  "lease",
  "receipt",
  "inspection_move_in",
  "inspection_move_out",
  "property_photo",
  "other",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: propertyId } = await params;
    const supabase = createServerSupabaseClient();

    // Check access: landlord who owns property OR tenant on this property
    const [propertyRes, tenantRes] = await Promise.all([
      supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("landlord_id", userId)
        .maybeSingle(),
      supabase
        .from("tenants")
        .select("id")
        .eq("property_id", propertyId)
        .eq("clerk_user_id", userId)
        .maybeSingle(),
    ]);

    if (!propertyRes.data && !tenantRes.data) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Optional ?type= filter
    const typeParam = request.nextUrl.searchParams.get("type");
    const documentTypeFilter =
      typeParam && VALID_DOCUMENT_TYPES.has(typeParam)
        ? (typeParam as DocumentType)
        : null;

    let query = supabase
      .from("documents")
      .select("*, tenants(name)")
      .eq("property_id", propertyId)
      .order("uploaded_at", { ascending: false });

    if (documentTypeFilter) {
      query = query.eq("document_type", documentTypeFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch documents:", error);
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }

    // Flatten the joined tenant name into tenant_name
    const documents: Document[] = (data ?? []).map((row) => {
      const { tenants: tenant, ...rest } = row as typeof row & {
        tenants: { name: string } | null;
      };
      return { ...rest, tenant_name: tenant?.name ?? null };
    });

    return NextResponse.json({ documents });
  } catch (err) {
    console.error("Unexpected error in GET /api/properties/[id]/documents:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
