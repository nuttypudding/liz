import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getRole } from "@/lib/clerk";
import { sendNotification } from "@/lib/notifications/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { confirmScheduleSchema } from "@/lib/validations";

// POST /api/scheduling/confirm
// Landlord confirms a specific time slot for a scheduling task.
// Returns 409 if double-booking is detected.
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (role !== "landlord") {
      return NextResponse.json({ error: "Forbidden: landlord role required" }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = confirmScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { taskId, selectedDate, selectedTimeStart, selectedTimeEnd } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Fetch task and verify landlord ownership
    const { data: task, error: taskError } = await supabase
      .from("scheduling_tasks")
      .select("*, maintenance_requests(property_id, work_order_text)")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Scheduling task not found" }, { status: 404 });
    }

    const req = task.maintenance_requests as { property_id: string; work_order_text: string } | null;
    if (!req) {
      return NextResponse.json({ error: "Associated request not found" }, { status: 404 });
    }

    const { data: property } = await supabase
      .from("properties")
      .select("id, name, address_line1, city, state, postal_code")
      .eq("id", req.property_id)
      .eq("landlord_id", userId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate status allows confirmation
    const allowedStatuses = ["pending", "awaiting_vendor", "rescheduling"];
    if (!allowedStatuses.includes(task.status)) {
      return NextResponse.json(
        { error: `Invalid status transition: cannot confirm from '${task.status}'` },
        { status: 422 }
      );
    }

    // Double-booking check: vendor
    const { data: vendorConflict } = await supabase
      .from("scheduling_tasks")
      .select("id")
      .eq("vendor_id", task.vendor_id)
      .eq("status", "confirmed")
      .eq("scheduled_date", selectedDate)
      .neq("id", taskId)
      .limit(1);

    if (vendorConflict && vendorConflict.length > 0) {
      return NextResponse.json(
        { error: "Vendor already has a confirmed appointment on this date" },
        { status: 409 }
      );
    }

    // Double-booking check: tenant
    const { data: tenantConflict } = await supabase
      .from("scheduling_tasks")
      .select("id")
      .eq("tenant_id", task.tenant_id)
      .eq("status", "confirmed")
      .eq("scheduled_date", selectedDate)
      .neq("id", taskId)
      .limit(1);

    if (tenantConflict && tenantConflict.length > 0) {
      return NextResponse.json(
        { error: "Tenant already has a confirmed appointment on this date" },
        { status: 409 }
      );
    }

    // Confirm the appointment
    const { data: updated, error: updateError } = await supabase
      .from("scheduling_tasks")
      .update({
        status: "confirmed",
        scheduled_date: selectedDate,
        scheduled_time_start: selectedTimeStart,
        scheduled_time_end: selectedTimeEnd,
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      console.error("[scheduling/confirm] update error:", updateError);
      return NextResponse.json({ error: "Failed to confirm appointment" }, { status: 500 });
    }

    const prop = property as {
      name: string;
      address_line1: string;
      city: string;
      state: string;
      postal_code: string;
    };
    const address = `${prop.address_line1}, ${prop.city}, ${prop.state} ${prop.postal_code}`;
    const notifData = {
      scheduledDate: selectedDate,
      scheduledTimeStart: selectedTimeStart,
      scheduledTimeEnd: selectedTimeEnd,
      propertyAddress: address,
      workOrderSummary: req.work_order_text ?? "",
    };

    // Fetch vendor and tenant emails from the DB
    const [vendorResult, tenantResult] = await Promise.all([
      supabase.from("vendors").select("email, name").eq("id", task.vendor_id).single(),
      supabase.from("tenants").select("email, name").eq("id", task.tenant_id).single(),
    ]);

    const notifications: Promise<unknown>[] = [];

    const vendor = vendorResult.data as { email: string | null; name: string } | null;
    if (vendor?.email) {
      notifications.push(
        sendNotification("vendor", task.vendor_id, "email", "schedule-confirmed", {
          ...notifData,
          to: vendor.email,
          recipientName: vendor.name,
        })
      );
    }

    const tenant = tenantResult.data as { email: string | null; name: string } | null;
    if (tenant?.email) {
      notifications.push(
        sendNotification("tenant", task.tenant_id, "email", "schedule-confirmed", {
          ...notifData,
          to: tenant.email,
          recipientName: tenant.name,
        })
      );
    }

    // Landlord email via Clerk
    try {
      const client = await clerkClient();
      const landlordUser = await client.users.getUser(userId);
      const landlordEmail = landlordUser.emailAddresses?.[0]?.emailAddress;
      if (landlordEmail) {
        notifications.push(
          sendNotification("landlord", userId, "email", "schedule-confirmed", {
            ...notifData,
            to: landlordEmail,
            recipientName: landlordUser.firstName ?? "Landlord",
          })
        );
      }
    } catch (clerkErr) {
      console.warn("[scheduling/confirm] Could not fetch landlord email from Clerk:", clerkErr);
    }

    await Promise.allSettled(notifications);

    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error("[scheduling/confirm] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
