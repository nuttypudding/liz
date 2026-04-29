import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { sendNotification } from "@/lib/notifications/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dispatchSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Forbidden: only landlords can dispatch vendors" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = dispatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { vendor_id, work_order_text } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Verify landlord owns the property associated with this request
    const { data: existing } = await supabase
      .from("maintenance_requests")
      .select("property_id, status, tenant_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    const { data: property } = await supabase
      .from("properties")
      .select("id, address_line1, city, state, postal_code")
      .eq("id", existing.property_id)
      .eq("landlord_id", userId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the vendor belongs to this landlord
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("id", vendor_id)
      .eq("landlord_id", userId)
      .single();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({
        status: "dispatched",
        vendor_id,
        work_order_text,
        dispatched_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Failed to dispatch vendor" },
        { status: 500 }
      );
    }

    // Create scheduling task (idempotency: skip if one already exists)
    let schedulingTask: Record<string, unknown> | null = null;

    if (existing.tenant_id) {
      const { data: existingTask, error: checkError } = await supabase
        .from("scheduling_tasks")
        .select("id")
        .eq("request_id", id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("[dispatch] Error checking for existing scheduling task:", checkError);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }

      if (existingTask) {
        schedulingTask = existingTask;
      } else {
        const { data: newTask, error: taskError } = await supabase
          .from("scheduling_tasks")
          .insert({
            request_id: id,
            vendor_id,
            tenant_id: existing.tenant_id,
            status: "awaiting_tenant",
            reschedule_count: 0,
          })
          .select()
          .single();

        if (taskError) {
          console.error("[dispatch] Failed to create scheduling task:", taskError);
          return NextResponse.json(
            { error: "Failed to create scheduling task" },
            { status: 500 }
          );
        }

        schedulingTask = newTask;

        // Send availability-prompt notification to tenant (non-blocking)
        const { data: tenant } = await supabase
          .from("tenants")
          .select("email, name")
          .eq("id", existing.tenant_id)
          .single();

        if (tenant?.email) {
          const prop = property as {
            address_line1: string;
            city: string;
            state: string;
            postal_code: string;
          };
          const propertyAddress = `${prop.address_line1}, ${prop.city}, ${prop.state} ${prop.postal_code}`;
          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? "https://web-lovat-sigma-36.vercel.app";
          const tenantResponseLink = `${baseUrl}/tenant/availability/${newTask.id}`;

          sendNotification("tenant", existing.tenant_id, "email", "availability-prompt", {
            to: tenant.email,
            tenantName: tenant.name,
            workOrderTitle: work_order_text,
            propertyAddress,
            availabilityDeadline: "within 48 hours",
            tenantResponseLink,
          }).catch((err) =>
            console.error("[dispatch] Tenant availability notification failed:", err)
          );
        }
      }
    }

    return NextResponse.json({ request: data, schedulingTask });
  } catch (err) {
    console.error("Unexpected error in POST /api/requests/[id]/dispatch:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
