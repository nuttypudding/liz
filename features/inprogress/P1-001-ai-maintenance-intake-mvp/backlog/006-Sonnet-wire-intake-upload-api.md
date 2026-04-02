---
id: 006
title: Wire intake submission and photo upload to Supabase
tier: Sonnet
depends_on: [1]
feature: ai-maintenance-intake-mvp
---

# 006 — Wire Intake Submission and Photo Upload to Supabase

## Objective

Make the intake submission flow real: upload photos to Supabase Storage, create a maintenance request record in the database, and return the request ID for subsequent classification.

## Context

- Existing route stubs:
  - `apps/web/app/api/intake/route.ts` — POST (create maintenance request)
  - `apps/web/app/api/upload/route.ts` — POST (upload photos)
- Supabase Storage bucket `request-photos` created in task 001
- Zod schema: `intakeSchema` = `{ tenant_message: string, photo_paths: string[], property_id: string (uuid) }`
- The submit page sends: message text + File[] photos
- Flow: Upload photos first → get storage paths → submit intake with paths

## Implementation

### POST /api/upload

Handle `multipart/form-data` with one or more image files:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const files = formData.getAll("photos") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > 5) {
    return NextResponse.json({ error: "Maximum 5 photos" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const paths: string[] = [];

  for (const file of files) {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
    }
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from("request-photos")
      .upload(storagePath, buffer, { contentType: file.type });

    if (error) throw error;
    paths.push(storagePath);
  }

  return NextResponse.json({ paths }, { status: 201 });
}
```

### POST /api/intake

```typescript
export async function POST(request: Request) {
  const { userId } = await auth();
  const supabase = createServerSupabaseClient();

  const body = await request.json();
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) { /* 400 */ }

  // Find the tenant record for this Clerk user
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  // Create the maintenance request
  const { data: req, error } = await supabase
    .from("maintenance_requests")
    .insert({
      property_id: parsed.data.property_id,
      tenant_id: tenant?.id,
      tenant_message: parsed.data.tenant_message,
      status: "submitted",
    })
    .select()
    .single();

  // Create request_photos records
  if (parsed.data.photo_paths?.length) {
    const photoRows = parsed.data.photo_paths.map((path) => ({
      request_id: req.id,
      storage_path: path,
      file_type: "image/" + (path.split(".").pop() || "jpeg"),
    }));
    await supabase.from("request_photos").insert(photoRows);
  }

  return NextResponse.json({ id: req.id }, { status: 201 });
}
```

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] POST /api/upload accepts multipart form data with image files
3. [ ] Photos are stored in Supabase Storage under `request-photos/{userId}/{uuid}.{ext}`
4. [ ] File type validation: only image/* allowed
5. [ ] File size validation: max 10MB per file, max 5 files
6. [ ] POST /api/intake creates a maintenance_requests row with status "submitted"
7. [ ] request_photos rows are created linking to the maintenance request
8. [ ] Returns the new request ID for subsequent classification
9. [ ] Proper error handling for storage failures
