import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "property-documents";
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;
    const supabase = createServerSupabaseClient();

    // Fetch the document; allow access for landlord owner or tenant on the same property
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("id, storage_path, landlord_id, property_id")
      .eq("id", documentId)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to fetch document:", fetchError);
      return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
    }

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify access: landlord owner OR tenant on this property
    const isLandlord = doc.landlord_id === userId;

    if (!isLandlord) {
      const { data: tenantMatch } = await supabase
        .from("tenants")
        .select("id")
        .eq("property_id", doc.property_id)
        .eq("clerk_user_id", userId)
        .maybeSingle();

      if (!tenantMatch) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(doc.storage_path, SIGNED_URL_EXPIRY_SECONDS);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Failed to create signed URL:", signedUrlError);
      return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrlData.signedUrl });
  } catch (err) {
    console.error("Unexpected error in GET /api/documents/[id]/url:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
