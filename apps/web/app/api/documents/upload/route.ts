import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { documentUploadSchema } from "@/lib/validations";
import type { Document } from "@/lib/types";

const STORAGE_BUCKET = "property-documents";
const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function isAllowedMimeType(mimeType: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    // Validate metadata fields
    const metaResult = documentUploadSchema.safeParse({
      property_id: formData.get("property_id"),
      document_type: formData.get("document_type"),
      tenant_id: formData.get("tenant_id") || null,
      description: formData.get("description") || "",
    });

    if (!metaResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: metaResult.error.flatten() },
        { status: 400 }
      );
    }

    const { property_id, document_type, tenant_id, description } = metaResult.data;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed per upload` },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify the property belongs to this landlord
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", property_id)
      .eq("landlord_id", userId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const createdDocuments: Document[] = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Invalid file entry in form data" },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 10 MB size limit` },
          { status: 400 }
        );
      }

      if (!isAllowedMimeType(file.type)) {
        return NextResponse.json(
          {
            error: `File "${file.name}" has unsupported type "${file.type}". Allowed: images, PDF, Word documents.`,
          },
          { status: 400 }
        );
      }

      const extension = file.name.split(".").pop() ?? "bin";
      const timestamp = Date.now();
      const storagePath = `${userId}/${property_id}/${timestamp}-${crypto.randomUUID()}.${extension}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, arrayBuffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        return NextResponse.json(
          { error: `Failed to upload file "${file.name}"` },
          { status: 500 }
        );
      }

      const { data: doc, error: insertError } = await supabase
        .from("documents")
        .insert({
          property_id,
          tenant_id: tenant_id ?? null,
          landlord_id: userId,
          document_type,
          storage_path: storagePath,
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          file_size: file.size,
          description: description || null,
        })
        .select()
        .single();

      if (insertError || !doc) {
        console.error("Supabase insert error:", insertError);
        // Best-effort cleanup of the uploaded file
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        return NextResponse.json(
          { error: `Failed to save document record for "${file.name}"` },
          { status: 500 }
        );
      }

      createdDocuments.push(doc as Document);
    }

    return NextResponse.json({ documents: createdDocuments }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/documents/upload:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
