import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "property-documents";

export async function DELETE(
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

    // Fetch the document and verify landlord ownership
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("id, storage_path, landlord_id")
      .eq("id", documentId)
      .eq("landlord_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to fetch document:", fetchError);
      return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
    }

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete from storage (best-effort: storage file may already be gone)
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([doc.storage_path]);

    if (storageError) {
      // Log but continue — the DB row should still be removed
      console.error("Storage deletion error (non-fatal):", storageError);
    }

    // Delete the DB row
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("landlord_id", userId);

    if (deleteError) {
      console.error("Failed to delete document record:", deleteError);
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/documents/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
