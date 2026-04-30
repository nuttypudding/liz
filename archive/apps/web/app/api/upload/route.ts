import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "request-photos";
const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const uploadedPaths: string[] = [];

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

      const extension = file.name.split(".").pop() ?? "bin";
      const timestamp = Date.now();
      const path = `${userId}/${timestamp}-${crypto.randomUUID()}.${extension}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, arrayBuffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (error) {
        console.error("Supabase storage upload error:", error);
        return NextResponse.json(
          { error: `Failed to upload file "${file.name}"` },
          { status: 500 }
        );
      }

      uploadedPaths.push(path);
    }

    return NextResponse.json({ paths: uploadedPaths }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/upload:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
