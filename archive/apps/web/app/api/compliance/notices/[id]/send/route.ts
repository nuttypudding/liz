import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const sendNoticeSchema = z.object({
  delivery_method: z.enum(["email", "print", "other"]).optional().default("email"),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: noticeId } = await params;
    const supabase = createServerSupabaseClient();

    // Get landlord profile
    const { data: profile } = await supabase
      .from("landlord_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Landlord profile not found" }, { status: 404 });
    }

    // Fetch notice and verify ownership
    const { data: notice, error: noticeError } = await supabase
      .from("compliance_notices")
      .select("id, property_id, landlord_id, type, status, content, created_at")
      .eq("id", noticeId)
      .single();

    if (noticeError || !notice) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    if (notice.landlord_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (notice.status !== "generated") {
      return NextResponse.json(
        { error: "Notice has already been sent or is not in a sendable state" },
        { status: 400 }
      );
    }

    // Parse request body
    const body: unknown = await request.json().catch(() => ({}));
    const parsed = sendNoticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { delivery_method, notes } = parsed.data;
    const sentAt = new Date().toISOString();

    // Update notice status
    const { data: updatedNotice, error: updateError } = await supabase
      .from("compliance_notices")
      .update({
        status: "sent",
        sent_at: sentAt,
        updated_at: sentAt,
      })
      .eq("id", noticeId)
      .select("id, property_id, type, status, content, sent_at")
      .single();

    if (updateError || !updatedNotice) {
      console.error("Failed to update notice status:", updateError);
      return NextResponse.json({ error: "Failed to update notice" }, { status: 500 });
    }

    // Log to audit trail
    try {
      await supabase.from("compliance_audit_log").insert({
        property_id: notice.property_id,
        landlord_id: profile.id,
        action_type: "notice_sent",
        details: {
          notice_id: noticeId,
          notice_type: notice.type,
          delivery_method,
          ...(notes ? { notes } : {}),
        },
      });
    } catch (auditErr) {
      console.error("Failed to log audit entry (non-critical):", auditErr);
    }

    return NextResponse.json({
      id: updatedNotice.id,
      property_id: updatedNotice.property_id,
      notice_type: updatedNotice.type,
      status: updatedNotice.status,
      content: updatedNotice.content,
      sent_at: updatedNotice.sent_at,
      delivery_method,
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/compliance/notices/[id]/send:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
